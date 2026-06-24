'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALLOWED_EXTENSIONS, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/fileUpload'

const IMAGE_FILE_TYPES = new Set(['image/jpeg', 'image/png'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getExtension(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ext ? `.${ext}` : ''
}

function validateUpload(file: File, imageOnly = false) {
  if (file.size > MAX_FILE_SIZE) {
    return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`
  }

  const extension = getExtension(file.name)
  const hasAllowedExtension = ALLOWED_EXTENSIONS.includes(extension)
  const hasAllowedMimeType = Object.keys(ALLOWED_FILE_TYPES).includes(file.type)

  if (!hasAllowedExtension || (file.type && !hasAllowedMimeType)) {
    return `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
  }

  if (imageOnly && !IMAGE_FILE_TYPES.has(file.type)) {
    return 'Only JPG and PNG images are allowed for form images'
  }

  return null
}

export async function uploadFile(
  formData: FormData,
  formId: string,
  _folder: string = 'responses',
  bucketName: string = 'form-uploads'
): Promise<{ url?: string; path?: string; error?: string }> {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  const file = formData.get('file') as File
  if (!file) {
    return { error: 'No file provided' }
  }

  if (!UUID_PATTERN.test(formId)) {
    return { error: 'Invalid form ID' }
  }

  if (bucketName !== 'form-uploads' && bucketName !== 'form-assets') {
    return { error: 'Invalid upload bucket' }
  }

  const imageOnly = bucketName === 'form-assets'
  const validationError = validateUpload(file, imageOnly)
  if (validationError) {
    return { error: validationError }
  }

  const { data: form, error: formError } = await adminSupabase
    .from('forms')
    .select('user_id, is_published, is_accepting_responses, closes_at')
    .eq('id', formId)
    .single()

  if (formError || !form) {
    return { error: 'Form not found' }
  }

  if (bucketName === 'form-assets') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (form.user_id !== user.id && profile?.role !== 'SUPER_USER') {
      return { error: 'Insufficient permissions' }
    }
  } else {
    const isClosed = !form.is_accepting_responses || (form.closes_at && new Date() > new Date(form.closes_at))
    if (!form.is_published || isClosed) {
      return { error: 'This form is not accepting uploads' }
    }
  }

  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const baseFolder = bucketName === 'form-assets' ? 'images' : 'responses'
  const filePath = `${baseFolder}/${formId}/${timestamp}-${sanitizedFileName}`

  try {
    const { error } = await adminSupabase.storage
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
    const { data: urlData } = adminSupabase.storage
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
    if (bucketName !== 'form-uploads' && bucketName !== 'form-assets') {
      return { error: 'Invalid file bucket' }
    }

    const inferredFormId = formId || filePath.split('/').find(part => UUID_PATTERN.test(part))

    if (!inferredFormId) {
      return { error: 'Could not verify file access' }
    }

    const expectedPrefix = bucketName === 'form-assets' ? `images/${inferredFormId}/` : `responses/${inferredFormId}/`
    if (!filePath.startsWith(expectedPrefix)) {
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

