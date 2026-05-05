'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Form } from '@/types'
import { getTemplateById } from '@/lib/formTemplates'

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
    .update({
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null
    })
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

export async function createFormFromTemplate(templateId: string, language: 'en' | 'dv' = 'en') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Check if user is Super User to pick the right client for field inserts
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isSuperUser = profile?.role === 'SUPER_USER'
  const client = isSuperUser ? await createAdminClient() : supabase

  const template = getTemplateById(templateId)
  if (!template) {
    return { error: 'Template not found' }
  }

  const slug = Math.random().toString(36).substring(2, 10)

  // 1. Create the form
  const { data: newForm, error: formError } = await supabase
    .from('forms')
    .insert({
      user_id: user.id,
      title: template.formDefaults.title,
      description: template.formDefaults.description,
      slug,
      is_published: false,
      settings: { language },
    })
    .select()
    .single()

  if (formError) {
    return { error: formError.message }
  }

  // 2. Bulk-insert all template fields
  if (template.fields.length > 0) {
    const fieldsToInsert = template.fields.map((f) => ({
      form_id: newForm.id,
      type: f.type,
      label: f.label,
      placeholder: f.placeholder,
      required: f.required,
      options: f.options,
      order_index: f.order_index,
    }))

    const { error: fieldsError } = await client
      .from('form_fields')
      .insert(fieldsToInsert)

    if (fieldsError) {
      // Roll back the form if field insert fails
      await supabase.from('forms').delete().eq('id', newForm.id)
      return { error: fieldsError.message }
    }
  }

  revalidatePath('/dashboard')
  return { success: true, id: newForm.id }
}

