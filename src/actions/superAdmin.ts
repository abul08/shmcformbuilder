'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function assignForm(formId: string, newUserId: string) {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // 1. Verify Requestor is SUPER_USER
    const { data: { user: requestor } } = await supabase.auth.getUser()
    if (!requestor) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', requestor.id)
        .single()

    if (profile?.role !== 'SUPER_USER') {
        return { error: 'Insufficient permissions' }
    }

    // 2. Verify new user exists
    const { data: newUserProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', newUserId)
        .single()

    if (!newUserProfile) {
        return { error: 'Target user not found' }
    }

    const { data: form, error: formError } = await adminClient
        .from('forms')
        .select('user_id, settings')
        .eq('id', formId)
        .single()

    if (formError || !form) {
        return { error: formError?.message || 'Form not found' }
    }

    const settings = {
        ...((form.settings as Record<string, unknown> | null) || {}),
        created_by: (form.settings as Record<string, unknown> | null)?.created_by || form.user_id,
        assigned_to: newUserId,
        assigned_by: requestor.id,
        assigned_at: new Date().toISOString(),
    }

    // 3. Update form owner
    const { error: updateError } = await adminClient
        .from('forms')
        .update({ user_id: newUserId, settings })
        .eq('id', formId)

    if (updateError) {
        return { error: updateError.message }
    }

    revalidatePath('/dashboard')
    revalidatePath(`/forms/${formId}/edit`)
    return { success: 'Form assigned successfully' }
}
