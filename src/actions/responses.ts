'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function submitResponse(formId: string, answers: Record<string, any>, metadata: any) {
  const adminSupabase = await createAdminClient()

  if (!UUID_PATTERN.test(formId)) {
    return { error: 'Invalid form ID' }
  }

  const { data: formCheck, error: formCheckError } = await adminSupabase
    .from('forms')
    .select('id, is_published, is_accepting_responses, closes_at, form_fields(id, type, required)')
    .eq('id', formId)
    .single()

  if (formCheckError || !formCheck) {
    return { error: 'Form not found' }
  }

  if (!formCheck.is_published) {
    return { error: 'Form is not published' }
  }

  const isClosed = !formCheck.is_accepting_responses || (formCheck.closes_at && new Date() > new Date(formCheck.closes_at))
  if (isClosed) {
    return { error: 'Form is not accepting responses' }
  }

  const ignoredFieldTypes = new Set(['section_header', 'text_block', 'image', 'bank_account', 'redirect_link', 'info_modal'])
  const fields = ((formCheck as any).form_fields || []).filter((field: any) => !ignoredFieldTypes.has(field.type))
  const fieldsById = new Map(fields.map((field: any) => [field.id, field]))
  const submittedFieldIds = Object.keys(answers || {})

  const unknownField = submittedFieldIds.find((fieldId) => !fieldsById.has(fieldId))
  if (unknownField) {
    return { error: 'Submission contains invalid fields' }
  }

  const isEmptyAnswer = (value: any) => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim().length === 0
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'boolean') return value === false
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
  }

  for (const field of fields) {
    const value = answers?.[field.id]
    if (field.required && isEmptyAnswer(value)) {
      return { error: 'Please fill all required fields' }
    }
  }

  const answerEntries: Array<{ field_id: string; value: any }> = []

  for (const fieldId of submittedFieldIds) {
    const field = fieldsById.get(fieldId) as any
    const value = answers[fieldId]
    if (isEmptyAnswer(value)) continue

    const cleanedValue = field.type === 'file' && typeof value === 'object'
      ? {
        fileName: String(value.fileName || 'Uploaded file').slice(0, 255),
        fileSize: Number(value.fileSize) || 0,
        fileType: String(value.fileType || '').slice(0, 100),
        filePath: String(value.filePath || ''),
      }
      : value

    if (field.type === 'file' && (!(cleanedValue as any).filePath || !(cleanedValue as any).filePath.startsWith(`responses/${formId}/`))) {
      return { error: 'Invalid uploaded file' }
    }

    if (JSON.stringify(cleanedValue).length > 100000) {
      return { error: 'One or more answers are too large' }
    }

    answerEntries.push({
      field_id: fieldId,
      value: cleanedValue,
    })
  }

  const safeMetadata = {
    user_agent: typeof metadata?.user_agent === 'string' ? metadata.user_agent.slice(0, 500) : 'unknown',
    language_mode: typeof metadata?.language_mode === 'string' ? metadata.language_mode.slice(0, 20) : undefined,
  }

  const { data: response, error: responseError } = await adminSupabase
    .from('form_responses')
    .insert({
      form_id: formId,
      metadata: safeMetadata,
    })
    .select()
    .single()

  if (responseError) {
    console.error('[SubmitResponse] Insert Error:', responseError)
    return { error: `Submission failed: ${responseError.message}` }
  }

  const { error: answersError } = answerEntries.length > 0
    ? await adminSupabase
      .from('form_answers')
      .insert(answerEntries.map((entry) => ({
        response_id: response.id,
        field_id: entry.field_id,
        value: entry.value,
      })))
    : { error: null }

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

  if (!UUID_PATTERN.test(formId)) {
    return { error: 'Invalid form ID' }
  }

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

  // A. Get all response IDs and uploaded files
  const { data: responses } = await adminSupabase
    .from('form_responses')
    .select('id, form_answers(value)')
    .eq('form_id', formId)

  if (responses && responses.length > 0) {
    const responseIds = responses.map(r => r.id)
    const filePaths = responses
      .flatMap((response: any) => response.form_answers || [])
      .map((answer: any) => answer?.value?.filePath)
      .filter((path: unknown): path is string => typeof path === 'string' && path.startsWith(`responses/${formId}/`))

    if (filePaths.length > 0) {
      const { error: storageError } = await adminSupabase.storage
        .from('form-uploads')
        .remove(filePaths)

      if (storageError) {
        console.error('Error deleting response files:', storageError)
      }
    }

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

  if (!UUID_PATTERN.test(formId) || !UUID_PATTERN.test(responseId)) {
    return { error: 'Invalid response ID' }
  }

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
    .filter((path: unknown): path is string => typeof path === 'string' && path.startsWith(`responses/${formId}/`))

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
