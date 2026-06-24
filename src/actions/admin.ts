'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const VALID_ROLES = new Set(['USER', 'SUPER_USER'])
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,40}$/

function sanitizeRole(role: FormDataEntryValue | null) {
    const value = String(role || 'USER')
    return VALID_ROLES.has(value) ? value : 'USER'
}

function sanitizeText(value: FormDataEntryValue | null, maxLength = 120) {
    return String(value || '').trim().slice(0, maxLength)
}

export async function createUser(formData: FormData) {
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

    // 2. Extract Data
    const username = sanitizeText(formData.get('username'), 40)
    const password = String(formData.get('password') || '')
    const fullName = sanitizeText(formData.get('fullName'))
    const department = sanitizeText(formData.get('department'))
    const role = sanitizeRole(formData.get('role'))

    if (!username || !password || !fullName) {
        return { error: 'Missing required fields' }
    }

    if (!USERNAME_PATTERN.test(username)) {
        return { error: 'Username can only contain letters, numbers, dots, underscores, and hyphens' }
    }

    if (password.length < 6) {
        return { error: 'Password must be at least 6 characters' }
    }

    // Auto-generate email from username
    const DOMAIN = 'internal.local'
    const email = `${username}@${DOMAIN}`

    // 3. Create User via Admin Client
    const { data: user, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    })

    if (createError) {
        return { error: createError.message }
    }

    if (!user.user) {
        return { error: 'Failed to create user' }
    }

    // 4. Create Profile Entry
    const { error: profileError } = await adminClient
        .from('profiles')
        .insert({
            id: user.user.id,
            username: username,
            full_name: fullName,
            department: department,
            role
        })

    if (profileError) {
        // Cleanup if profile creation fails? Or just return error.
        return { error: 'User created but profile failed: ' + profileError.message }
    }

    revalidatePath('/admin')
    return { success: 'User created successfully' }
}

export async function deleteUser(userId: string) {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Verify Permissions
    const { data: { user: requestor } } = await supabase.auth.getUser()
    if (!requestor) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', requestor.id)
        .single()

    if (profile?.role !== 'SUPER_USER') return { error: 'Forbidden' }

    if (userId === requestor.id) {
        return { error: 'You cannot delete your own account' }
    }

    // Delete User
    const { error } = await adminClient.auth.admin.deleteUser(userId)

    if (error) return { error: error.message }

    revalidatePath('/admin')
    return { success: 'User deleted' }
}

export async function updateUser(userId: string, formData: FormData) {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Verify Permissions
    const { data: { user: requestor } } = await supabase.auth.getUser()
    if (!requestor) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', requestor.id)
        .single()

    if (profile?.role !== 'SUPER_USER') return { error: 'Forbidden' }

    // Extract Data
    const fullName = sanitizeText(formData.get('fullName'))
    const department = sanitizeText(formData.get('department'))
    const role = sanitizeRole(formData.get('role'))
    const email = sanitizeText(formData.get('email'), 254)

    if (!fullName) {
        return { error: 'Full name is required' }
    }

    // Update Auth User (Email/Metadata)
    const updateData: any = {
        user_metadata: { full_name: fullName }
    }
    if (email) {
        updateData.email = email
    }

    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, updateData)

    if (authError) return { error: authError.message }

    // Update Profile
    const { error: profileError } = await adminClient
        .from('profiles')
        .update({
            full_name: fullName,
            department: department,
            role
        })
        .eq('id', userId)

    if (profileError) return { error: profileError.message }

    revalidatePath('/admin')
    return { success: 'User updated successfully' }
}

export async function resetUserPassword(userId: string, formData: FormData) {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Verify Permissions
    const { data: { user: requestor } } = await supabase.auth.getUser()
    if (!requestor) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', requestor.id)
        .single()

    if (profile?.role !== 'SUPER_USER') return { error: 'Forbidden' }

    const password = String(formData.get('password') || '')
    if (!password || password.length < 6) return { error: 'Password must be at least 6 characters' }

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
        password: password
    })

    if (error) return { error: error.message }

    return { success: 'Password reset successfully' }
}
