'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { FormField, FormFieldType, Json } from '@/types'

async function getSupabaseClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { client: supabase, user: null }

  // Check if user is Super User
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isSuperUser = profile?.role === 'SUPER_USER'

  // If Super User, return Admin Client to bypass RLS for fields
  // Otherwise return standard client
  if (isSuperUser) {
    const adminClient = await createAdminClient()
    return { client: adminClient, user, isSuperUser: true }
  }

  return { client: supabase, user, isSuperUser: false }
}

export async function addField(formId: string, type: FormFieldType, orderIndex: number) {
  const { client, user } = await getSupabaseClient()

  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await client
    .from('form_fields')
    .insert({
      form_id: formId,
      type,
      label: `New ${type.replace('_', ' ')}`,
      order_index: orderIndex,
      required: false,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/forms/${formId}/edit`)
  return { data }
}

export async function updateField(id: string, formId: string, updates: Partial<FormField>) {
  const { client, user } = await getSupabaseClient()

  if (!user) return { error: 'Unauthorized' }

  const { error } = await client
    .from('form_fields')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/forms/${formId}/edit`)
}

export async function deleteField(id: string, formId: string) {
  const { client, user } = await getSupabaseClient()

  if (!user) return { error: 'Unauthorized' }

  const { error } = await client
    .from('form_fields')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/forms/${formId}/edit`)
}

export async function reorderFields(formId: string, fieldIds: string[]) {
  const { client, user } = await getSupabaseClient()

  if (!user) return { error: 'Unauthorized' }

  const updates = fieldIds.map((id, index) => ({
    id,
    order_index: index,
  }))

  // Supabase doesn't support bulk update with different values easily in one call via .update()
  // but we can use a RPC or just multiple calls for now. For simplicity, multiple calls.
  // In a real app, a single RPC would be better.
  for (const update of updates) {
    await client
      .from('form_fields')
      .update({ order_index: update.order_index })
      .eq('id', update.id)
  }

  revalidatePath(`/forms/${formId}/edit`)
}

export async function updateFormDetails(id: string, updates: { title?: string, description?: string | null, settings?: Json }, slug?: string) {
  const { client, user } = await getSupabaseClient()

  if (!user) return { error: 'Unauthorized' }

  const { error } = await client
    .from('forms')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  if (slug) {
    revalidatePath(`/f/${slug}`)
  }
}
