'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function submitResponse(formId: string, answers: Record<string, any>, metadata: any) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()



  // Debug: Check if form exists and is published
  const { data: formCheck, error: formCheckError } = await supabase
    .from('forms')
    .select('id, is_published, title')
    .eq('id', formId)
    .single()

  if (formCheckError || !formCheck) {
    console.error('[SubmitResponse] Form check failed:', formCheckError)
    return { error: `Form Check Failed: ${formCheckError?.message || 'Form not found or unpublished'}` }
  }



  if (!formCheck.is_published) {
    console.error('[SubmitResponse] Form is NOT published.')
    return { error: 'Form is not published' }
  }

  // 1. Create response record
  const { data: response, error: responseError } = await adminSupabase
    .from('form_responses')
    .insert({
      form_id: formId,
      metadata,
    })
    .select()
    .single()

  if (responseError) {
    console.error('[SubmitResponse] Insert Error:', responseError)
    return { error: `Submission failed: ${responseError.message}` }
  }

  // 2. Create answer records

  const answerEntries = Object.entries(answers).map(([fieldId, value]) => ({
    response_id: response.id,
    field_id: fieldId,
    value: value,
  }))



  const { error: answersError } = await adminSupabase
    .from('form_answers')
    .insert(answerEntries)

  if (answersError) {
    console.error('[SubmitResponse] Answers Insert Error:', answersError)
    return { error: answersError.message }
  }


  return { success: true }
}

export async function clearFormResponses(formId: string) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // 1. Verify Ownership
  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('user_id')
    .eq('id', formId)
    .single()

  if (formError || !form) {
    return { error: 'Form not found' }
  }

  // Check if user is owner OR Super User
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (form.user_id !== user.id && profile?.role !== 'SUPER_USER') {
    return { error: 'Insufficient permissions' }
  }

  // 2. Delete Responses & Answers (Admin Client)

  // A. Get all response IDs
  const { data: responses } = await adminSupabase
    .from('form_responses')
    .select('id')
    .eq('form_id', formId)

  if (responses && responses.length > 0) {
    const responseIds = responses.map(r => r.id)

    // Delete answers
    const { error: answersError } = await adminSupabase
      .from('form_answers')
      .delete()
      .in('response_id', responseIds)

    if (answersError) {
      console.error('Error deleting answers:', answersError)
      // Continue anyway as RLS might be weird, but usually this is needed if no cascade 
    }
  }

  // Delete Responses
  const { error: deleteError } = await adminSupabase
    .from('form_responses')
    .delete()
    .eq('form_id', formId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath(`/forms/${formId}/responses`)
  return { success: true }
}

export async function deleteFormResponse(formId: string, responseId: string) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: response, error: responseError } = await adminSupabase
    .from('form_responses')
    .select('id, form_id, forms(user_id), form_answers(value)')
    .eq('id', responseId)
    .eq('form_id', formId)
    .single()

  if (responseError || !response) {
    return { error: 'Response not found' }
  }

  const ownerId = Array.isArray((response as any).forms)
    ? (response as any).forms[0]?.user_id
    : (response as any).forms?.user_id

  if (ownerId !== user.id && profile?.role !== 'SUPER_USER') {
    return { error: 'Insufficient permissions' }
  }

  const filePaths = ((response as any).form_answers || [])
    .map((answer: any) => answer?.value?.filePath)
    .filter((path: unknown): path is string => typeof path === 'string' && path.length > 0)

  if (filePaths.length > 0) {
    const { error: storageError } = await adminSupabase.storage
      .from('form-uploads')
      .remove(filePaths)

    if (storageError) {
      console.error('Error deleting response files:', storageError)
    }
  }

  const { error: answersError } = await adminSupabase
    .from('form_answers')
    .delete()
    .eq('response_id', responseId)

  if (answersError) {
    return { error: answersError.message }
  }

  const { error: deleteError } = await adminSupabase
    .from('form_responses')
    .delete()
    .eq('id', responseId)
    .eq('form_id', formId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath(`/forms/${formId}/responses`)
  return { success: true }
}
