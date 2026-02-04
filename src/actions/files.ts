'use server'

import { createClient } from '@/lib/supabase/server'

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
      return { error: error.message }
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

export async function getSignedUrl(filePath: string, bucketName: string = 'form-uploads'): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600) // 1 hour expiry

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
