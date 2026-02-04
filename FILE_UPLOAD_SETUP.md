# File Upload Feature - Setup Guide

## 📋 Overview

The FormBuilder now supports file uploads with the following specifications:

- **Allowed File Types**: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG
- **Maximum File Size**: 10MB per file
- **Storage**: Supabase Storage (private bucket with signed URLs)
- **Security**: Row Level Security (RLS) policies for access control

## 🚀 Setup Instructions

### Step 1: Update Database Schema

Run the updated `schema.sql` file in your Supabase SQL Editor. This will:

1. Add 'file' to the allowed field types in the `form_fields` table
2. Set up the storage bucket and policies

```sql
-- Already included in schema.sql
-- The form_fields CHECK constraint now includes 'file'
```

### Step 2: Create Supabase Storage Bucket

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"Create a new bucket"**
3. Enter these details:
   - **Bucket name**: `form-uploads`
   - **Public bucket**: **NO** (unchecked) - We'll use signed URLs for security
4. Click **"Create bucket"**

#### Option B: Using SQL (Run in SQL Editor)

```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', false)
ON CONFLICT (id) DO NOTHING;
```

### Step 3: Set Up Storage Policies

Run these SQL commands in the **Supabase SQL Editor**:

```sql
-- Policy 1: Allow anyone to upload files to form responses
CREATE POLICY "Public can upload files to form responses"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'form-uploads' AND
  (storage.foldername(name))[1] = 'responses'
);

-- Policy 2: Form owners can read their form uploads
CREATE POLICY "Users can read their form uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'form-uploads' AND
  auth.uid() IN (
    SELECT user_id FROM public.forms
    WHERE id::text = (storage.foldername(name))[2]
  )
);

-- Policy 3: Form owners can delete their form uploads
CREATE POLICY "Users can delete their form uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'form-uploads' AND
  auth.uid() IN (
    SELECT user_id FROM public.forms
    WHERE id::text = (storage.foldername(name))[2]
  )
);
```

### Step 4: Verify Setup

1. **Check Bucket Creation**:
   - Go to **Storage** in Supabase Dashboard
   - Verify `form-uploads` bucket exists and is **private** (not public)

2. **Check Policies**:
   - Go to **Storage** → Click on `form-uploads` bucket → **Policies** tab
   - Verify you see 3 policies listed

3. **Check Database Schema**:
   ```sql
   -- Run this query to verify the field type constraint
   SELECT conname, pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conrelid = 'form_fields'::regclass 
   AND conname LIKE '%type%';
   ```
   - Should show that 'file' is included in the CHECK constraint

## 🎨 How It Works

### File Upload Flow

1. **User selects a file** on the public form page
2. **Client-side validation** checks:
   - File type is allowed
   - File size is under 10MB
3. **File is uploaded** to Supabase Storage when form is submitted
4. **File metadata** is saved in the `form_answers` table as JSON:
   ```json
   {
     "fileName": "document.pdf",
     "fileSize": 2048576,
     "fileType": "application/pdf",
     "filePath": "responses/{formId}/{responseId}/1234567890-document.pdf",
     "fileUrl": "https://..."
   }
   ```

### Storage Structure

Files are organized in this structure:

```
form-uploads/
└── responses/
    └── {formId}/
        └── {responseId}/
            ├── 1234567890-file1.pdf
            ├── 1234567891-file2.docx
            └── ...
```

### Security Features

1. **Private Bucket**: Files are not publicly accessible
2. **Signed URLs**: Temporary URLs (1 hour expiry) are generated for form owners
3. **RLS Policies**: Only form owners can view/download/delete files
4. **Client Validation**: File type and size checked before upload
5. **Server Validation**: Additional validation on server-side

## 📝 Using File Upload Fields

### In Form Builder

1. Click **"File Upload"** button to add a file upload field
2. Configure the field:
   - **Question**: Label for the file upload field
   - **Required**: Toggle whether the file is required
3. The field type selector shows "file" but cannot be changed (file fields stay file fields)

### In Public Forms

Users will see:

- **Drag & drop area** with upload icon
- **File requirements** (types and size limit)
- **Upload progress** indicator
- **File preview** showing:
  - File icon (📄 PDF, 📝 DOC, 📊 XLS, 🖼️ Images)
  - File name
  - File size
- **Remove button** (X) to change the file

### Viewing Responses

In the **Responses** page:

- File uploads show as clickable download links
- Click to download the file (generates signed URL)
- File name and size are displayed

## 🔧 Technical Details

### Files Modified/Created

1. **Types**: `src/types/index.ts` - Added 'file' to FormFieldType
2. **Schema**: `schema.sql` - Updated field type constraint and added storage policies
3. **Utilities**: `src/lib/fileUpload.ts` - File validation and helpers
4. **Actions**: `src/actions/files.ts` - Server actions for file operations
5. **Components**:
   - `src/components/FormBuilder.tsx` - Added "File Upload" button
   - `src/components/PublicForm.tsx` - File upload field rendering and handling

### File Validation

```typescript
// Allowed file types
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc', '.docx',
  '.xls', '.xlsx',
  '.jpg', '.jpeg', '.png'
]

// Maximum file size
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
```

### API Endpoints

- **Upload File**: `uploadFile(formData, formId, responseId)`
- **Get Signed URL**: `getSignedUrl(filePath)` - For secure downloads
- **Delete File**: `deleteFile(filePath)` - For cleanup

## ⚠️ Important Notes

1. **File Storage Costs**: Supabase Storage has usage limits on the free tier. Monitor your usage in the Supabase dashboard.

2. **File Size**: The 10MB limit is enforced client-side and should also be configured in your server/proxy if you have one.

3. **Cleanup**: Files are automatically deleted when:
   - A form is deleted (via CASCADE on storage policies)
   - A response is deleted (you may want to add cleanup logic)

4. **Backup**: Consider setting up automated backups for your storage bucket if you have important files.

5. **Testing**: After setup, create a test form with a file upload field and submit a response to verify everything works.

## 🐛 Troubleshooting

### Issue: "Failed to upload file"

**Solutions**:
- Verify the storage bucket exists and is named exactly `form-uploads`
- Check that storage policies are created correctly
- Ensure the file meets size and type requirements
- Check Supabase Storage logs in the dashboard

### Issue: "Cannot download uploaded files"

**Solutions**:
- Verify RLS policies are set up for SELECT operations
- Check that the signed URL generation is working
- Ensure you're logged in as the form owner

### Issue: "File upload field not showing"

**Solutions**:
- Clear browser cache and hard reload
- Verify the database schema includes 'file' in the CHECK constraint
- Check browser console for JavaScript errors

## 📚 Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [File Upload Best Practices](https://supabase.com/docs/guides/storage/uploads)

## ✅ Setup Checklist

- [ ] Updated database schema (run `schema.sql`)
- [ ] Created `form-uploads` storage bucket (private)
- [ ] Applied storage RLS policies (3 policies total)
- [ ] Verified bucket and policies in Supabase Dashboard
- [ ] Tested file upload on a test form
- [ ] Tested file download from responses page
- [ ] Verified file size and type validation works
- [ ] Cleared any build caches (`rm -rf .next` and restart)

---

**Your FormBuilder app now supports secure file uploads!** 🎉
