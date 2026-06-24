'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function uploadFile(
  formData: FormData,
  formId: string,
  folder: string = 'responses',
  bucketName: string = 'form-uploads'
): Promise<{ url?: string; path?: string; error?: string }> {
  const supabase = await createClient()

  const file = formData.get('file') as File
  if (!file) {
    return { error: 'No file provided' }
  }

  // Generate unique file path: {folder}/{formId}/{timestamp}-{filename}
  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  // If folder is 'responses', we keep current structure for backward compatibility or adjust clients
  // But let's make it generic: folder/formId/...
  // Caller passes 'responses/responseId' if needed.

  const filePath = `${folder}/${formId}/${timestamp}-${sanitizedFileName}`

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return { error: `Upload Failed: ${error.message} (Code: ${error.statusCode})` }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    return {
      path: filePath,
      url: urlData.publicUrl,
    }
  } catch (error) {
    console.error('Upload exception:', error)
    return { error: 'Failed to upload file' }
  }
}

export async function getSignedUrl(
  filePath: string,
  bucketName: string = 'form-uploads',
  formId?: string,
  downloadName?: string
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  try {
    const inferredFormId = formId || filePath.split('/').find(part =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(part)
    )

    if (!inferredFormId) {
      return { error: 'Could not verify file access' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const { data: form, error: formError } = await adminSupabase
      .from('forms')
      .select('user_id')
      .eq('id', inferredFormId)
      .single()

    if (formError || !form) {
      return { error: 'Form not found' }
    }

    if (form.user_id !== user.id && profile?.role !== 'SUPER_USER') {
      return { error: 'Insufficient permissions' }
    }

    const storage = adminSupabase.storage.from(bucketName) as any
    const { data, error } = await storage.createSignedUrl(
      filePath,
      3600,
      downloadName ? { download: downloadName } : undefined
    )

    if (error) {
      return { error: error.message }
    }

    return { url: data.signedUrl }
  } catch (error) {
    return { error: 'Failed to generate signed URL' }
  }
}

export async function deleteFile(filePath: string, bucketName: string = 'form-uploads'): Promise<{ error?: string }> {
  const supabase = await createClient()

  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath])

    if (error) {
      return { error: error.message }
    }

    return {}
  } catch (error) {
    return { error: 'Failed to delete file' }
  }
}
