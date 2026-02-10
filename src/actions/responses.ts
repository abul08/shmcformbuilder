'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function submitResponse(formId: string, answers: Record<string, any>, metadata: any) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  console.log('[SubmitResponse] Attempting submission for Form ID:', formId)

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

  console.log('[SubmitResponse] Form found:', formCheck)

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
  console.log('[SubmitResponse] Creating answers for response:', response.id)
  const answerEntries = Object.entries(answers).map(([fieldId, value]) => ({
    response_id: response.id,
    field_id: fieldId,
    value: value,
  }))

  console.log('[SubmitResponse] Answer entries payload:', JSON.stringify(answerEntries, null, 2))

  const { error: answersError } = await adminSupabase
    .from('form_answers')
    .insert(answerEntries)

  if (answersError) {
    console.error('[SubmitResponse] Answers Insert Error:', answersError)
    return { error: answersError.message }
  }

  console.log('[SubmitResponse] Submission successful')
  return { success: true }
}
