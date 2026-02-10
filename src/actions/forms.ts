'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Form } from '@/types'

export async function createForm(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const title = formData.get('title') as string || 'Untitled Form'
  const language = formData.get('language') as string || 'en'
  const slug = Math.random().toString(36).substring(2, 10)

  const { data, error } = await supabase
    .from('forms')
    .insert({
      user_id: user.id,
      title,
      slug,
      is_published: false,
      settings: { language: language }
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase Create Form Error:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true, id: data.id }
}

export async function deleteForm(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('forms').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
}

export async function togglePublish(id: string, isPublished: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('forms')
    .update({ is_published: isPublished })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/forms/${id}/edit`)
  revalidatePath(`/forms/${id}/edit`)
}

export async function updateFormSettings(id: string, updates: { is_accepting_responses?: boolean, closes_at?: string | null }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('forms')
    .update(updates)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/forms/${id}/edit`)
}

export async function duplicateForm(id: string) {
  const supabase = await createClient()

  // 1. Get the original form
  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('*, form_fields(*)')
    .eq('id', id)
    .single()

  if (formError) return { error: formError.message }

  // 2. Create new form
  const newSlug = Math.random().toString(36).substring(2, 10)
  const { data: newForm, error: newFormError } = await supabase
    .from('forms')
    .insert({
      user_id: form.user_id,
      title: `${form.title} (Copy)`,
      description: form.description,
      slug: newSlug,
      is_published: false,
    })
    .select()
    .single()

  if (newFormError) return { error: newFormError.message }

  // 3. Duplicate fields
  if (form.form_fields && form.form_fields.length > 0) {
    const newFields = form.form_fields.map((field: any) => {
      const { id, created_at, form_id, active, ...rest } = field
      return {
        ...rest,
        form_id: newForm.id,
      }
    })

    const { error: fieldsError } = await supabase
      .from('form_fields')
      .insert(newFields)

    if (fieldsError) return { error: fieldsError.message }
  }

  revalidatePath('/dashboard')
}
