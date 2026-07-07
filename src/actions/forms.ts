'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { FormTemplate, getTemplateById } from '@/lib/formTemplates'

function createSlug() {
  return Math.random().toString(36).substring(2, 10)
}

function isTemplateSettings(settings: any) {
  return settings?.is_template === true || settings?.is_template === 'true'
}

function cleanTemplateSettings(settings: any, language?: 'en' | 'dv') {
  const next = { ...(settings || {}) }
  delete next.is_template
  delete next.template_source_form_id
  delete next.template_saved_at
  delete next.template_created_by

  return {
    ...next,
    language: language || next.language || 'en',
  }
}

async function getCurrentUserContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, isSuperUser: false, client: supabase }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isSuperUser = profile?.role === 'SUPER_USER'
  const client = isSuperUser ? await createAdminClient() : supabase

  return { supabase, user, isSuperUser, client }
}

export async function createForm(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const title = formData.get('title') as string || 'Untitled Form'
  const language = formData.get('language') as string || 'en'
  const slug = createSlug()

  const { data, error } = await supabase
    .from('forms')
    .insert({
      user_id: user.id,
      title,
      slug,
      is_published: false,
      settings: { language: language, created_by: user.id }
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

export async function updateFormSettings(id: string, updates: { is_accepting_responses?: boolean, closes_at?: string | null, settings?: any }) {
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

export async function saveFormAsTemplate(id: string, templateName?: string) {
  const { supabase, user, client } = await getCurrentUserContext()

  if (!user) return { error: 'Unauthorized' }

  const { data: form, error: formError } = await client
    .from('forms')
    .select('*, form_fields(*)')
    .eq('id', id)
    .single()

  if (formError || !form) {
    return { error: formError?.message || 'Form not found' }
  }

  if (isTemplateSettings(form.settings)) {
    return { error: 'This form is already a saved template.' }
  }

  const name = templateName?.trim() || form.title

  const settings = {
    ...(form.settings || {}),
    is_template: true,
    template_form_title: form.title,
    template_form_description: form.description,
    template_source_form_id: form.id,
    template_saved_at: new Date().toISOString(),
    template_created_by: user.id,
  }

  const { data: template, error: templateError } = await supabase
    .from('forms')
    .insert({
      user_id: user.id,
      title: name,
      description: form.description,
      slug: createSlug(),
      is_published: false,
      is_accepting_responses: false,
      closes_at: null,
      settings,
    })
    .select()
    .single()

  if (templateError) return { error: templateError.message }

  if (form.form_fields && form.form_fields.length > 0) {
    const fields = form.form_fields.map((field: any) => {
      const { id, created_at, form_id, active, ...rest } = field
      return {
        ...rest,
        form_id: template.id,
      }
    })

    const { error: fieldsError } = await client
      .from('form_fields')
      .insert(fields)

    if (fieldsError) {
      await supabase.from('forms').delete().eq('id', template.id)
      return { error: fieldsError.message }
    }
  }

  revalidatePath('/dashboard')
  return { success: true, id: template.id }
}

export async function getSavedFormTemplates(): Promise<{ templates?: FormTemplate[], error?: string }> {
  const { user, client, isSuperUser } = await getCurrentUserContext()

  if (!user) return { error: 'Unauthorized' }

  let query = client
    .from('forms')
    .select('id, user_id, title, description, settings, created_at, form_fields(*)')
    .eq('settings->>is_template', 'true')
    .order('created_at', { ascending: false })

  if (!isSuperUser) {
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query

  if (error) return { error: error.message }

  const templates: FormTemplate[] = (data || []).map((form: any) => {
    const settings = form.settings || {}
    const fields = [...(form.form_fields || [])]
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((field: any) => ({
        type: field.type,
        label: field.label,
        placeholder: field.placeholder,
        required: field.required,
        options: field.options,
        order_index: field.order_index,
      }))

    return {
      id: form.id,
      source: 'saved',
      name: form.title,
      description: form.description || 'Saved from one of your forms.',
      language: settings.language === 'dv' ? 'dv' : 'en',
      emoji: '*',
      category: 'Saved',
      createdBy: form.user_id,
      createdAt: form.created_at,
      fields,
      formDefaults: {
        title: settings.template_form_title || form.title,
        description: settings.template_form_description || form.description || '',
      },
    }
  })

  return { templates }
}

export async function createFormFolder(formData: FormData) {
  const { user, client, isSuperUser } = await getCurrentUserContext()

  if (!user) return { error: 'Unauthorized' }

  const folderName = (formData.get('folderName') as string || '').trim()
  const formIds = formData.getAll('formIds').map(String).filter(Boolean)

  if (!folderName) return { error: 'Folder name is required' }
  if (formIds.length === 0) return { error: 'Select at least one form' }

  let query = client
    .from('forms')
    .select('id, user_id, settings')
    .in('id', formIds)

  if (!isSuperUser) {
    query = query.eq('user_id', user.id)
  }

  const { data: forms, error: fetchError } = await query

  if (fetchError) return { error: fetchError.message }
  if (!forms || forms.length !== formIds.length) {
    return { error: 'Some selected forms could not be found or are not yours.' }
  }

  const updates = forms.map((form: any) => {
    const settings = {
      ...(form.settings || {}),
      folder_name: folderName,
    }

    return client
      .from('forms')
      .update({ settings })
      .eq('id', form.id)
  })

  const results = await Promise.all(updates)
  const failed = results.find((result) => result.error)
  if (failed?.error) return { error: failed.error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateFormFolder(formId: string, folderName: string | null) {
  const { user, client, isSuperUser } = await getCurrentUserContext()

  if (!user) return { error: 'Unauthorized' }

  let query = client
    .from('forms')
    .select('id, user_id, settings')
    .eq('id', formId)

  if (!isSuperUser) {
    query = query.eq('user_id', user.id)
  }

  const { data: form, error: fetchError } = await query.single()

  if (fetchError || !form) {
    return { error: fetchError?.message || 'Form not found' }
  }

  const settings = { ...((form as any).settings || {}) }
  const nextName = folderName?.trim()

  if (nextName) {
    settings.folder_name = nextName
  } else {
    delete settings.folder_name
  }

  const { error } = await client
    .from('forms')
    .update({ settings })
    .eq('id', formId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function createFormFromTemplate(templateId: string, language: 'en' | 'dv' = 'en') {
  const { supabase, user, client } = await getCurrentUserContext()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const template = getTemplateById(templateId)
  const slug = createSlug()

  if (!template) {
    const { data: savedTemplate, error: templateError } = await client
      .from('forms')
      .select('*, form_fields(*)')
      .eq('id', templateId)
      .single()

    if (templateError || !savedTemplate || !isTemplateSettings(savedTemplate.settings)) {
      return { error: templateError?.message || 'Template not found' }
    }

    const templateLanguage = savedTemplate.settings?.language === 'dv' ? 'dv' : language

    const { data: newForm, error: formError } = await supabase
      .from('forms')
      .insert({
        user_id: user.id,
        title: savedTemplate.settings?.template_form_title || savedTemplate.title,
        description: savedTemplate.settings?.template_form_description || savedTemplate.description,
        slug,
        is_published: false,
        is_accepting_responses: true,
        closes_at: null,
        settings: {
          ...cleanTemplateSettings(savedTemplate.settings, templateLanguage),
          created_by: user.id,
        },
      })
      .select()
      .single()

    if (formError) {
      return { error: formError.message }
    }

    if (savedTemplate.form_fields && savedTemplate.form_fields.length > 0) {
      const fieldsToInsert = savedTemplate.form_fields.map((field: any) => {
        const { id, created_at, form_id, active, ...rest } = field
        return {
          ...rest,
          form_id: newForm.id,
        }
      })

      const { error: fieldsError } = await client
        .from('form_fields')
        .insert(fieldsToInsert)

      if (fieldsError) {
        await supabase.from('forms').delete().eq('id', newForm.id)
        return { error: fieldsError.message }
      }
    }

    revalidatePath('/dashboard')
    return { success: true, id: newForm.id }
  }

  const templateLanguage = template.language || language

  // 1. Create the form
  const { data: newForm, error: formError } = await supabase
    .from('forms')
    .insert({
      user_id: user.id,
      title: template.formDefaults.title,
      description: template.formDefaults.description,
      slug,
      is_published: false,
      settings: { language: templateLanguage, created_by: user.id },
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

