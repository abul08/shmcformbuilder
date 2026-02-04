-- Create tables for Form Builder

-- 1. Forms table
CREATE TABLE public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Form',
    description TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    is_accepting_responses BOOLEAN DEFAULT TRUE,
    closes_at TIMESTAMP WITH TIME ZONE,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb
);

-- 2. Form Fields table
CREATE TABLE public.form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('short_text', 'long_text', 'email', 'number', 'checkbox', 'radio', 'dropdown', 'date', 'file', 'image', 'text_block', 'consent', 'english_text', 'dhivehi_text')),
    label TEXT NOT NULL,
    placeholder TEXT,
    required BOOLEAN DEFAULT FALSE,
    options JSONB, -- For radio, checkbox, dropdown
    order_index INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Form Responses table
CREATE TABLE public.form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- ip, user_agent, etc.
);

-- 4. Form Answers table
CREATE TABLE public.form_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES public.form_responses(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES public.form_fields(id) ON DELETE CASCADE,
    value JSONB NOT NULL, -- Store as JSONB to handle multiple values (checkboxes)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Forms: Users can only CRUD their own forms
CREATE POLICY "Users can create their own forms" ON public.forms
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own forms" ON public.forms
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own forms" ON public.forms
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forms" ON public.forms
    FOR DELETE USING (auth.uid() = user_id);

-- Public can view published forms by slug (we'll handle this in the app logic too)
CREATE POLICY "Public can view published forms" ON public.forms
    FOR SELECT USING (is_published = true);

-- Form Fields: Users can CRUD fields of their own forms
CREATE POLICY "Users can manage fields of their own forms" ON public.form_fields
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.forms
            WHERE forms.id = form_fields.form_id
            AND forms.user_id = auth.uid()
        )
    );

CREATE POLICY "Public can view fields of published forms" ON public.form_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.forms
            WHERE forms.id = form_fields.form_id
            AND forms.is_published = true
        )
    );

-- Form Responses: Users can view responses to their own forms
CREATE POLICY "Users can view responses to their own forms" ON public.form_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.forms
            WHERE forms.id = form_responses.form_id
            AND forms.user_id = auth.uid()
        )
    );

-- Public can insert responses
CREATE POLICY "Public can insert responses" ON public.form_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.forms
            WHERE forms.id = form_id
            AND forms.is_published = true
        )
    );

-- Form Answers: Users can view answers to their own forms
CREATE POLICY "Users can view answers to their own forms" ON public.form_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.form_responses
            JOIN public.forms ON forms.id = form_responses.form_id
            WHERE form_responses.id = response_id
            AND forms.user_id = auth.uid()
        )
    );

-- Public can insert answers
CREATE POLICY "Public can insert answers" ON public.form_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.form_responses
            JOIN public.forms ON forms.id = form_responses.form_id
            WHERE form_responses.id = response_id
            AND forms.is_published = true
        )
    );

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.forms
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- =========================================
-- STORAGE SETUP FOR FILE UPLOADS
-- =========================================
-- Run these commands in Supabase Dashboard > Storage

-- 1. Create a storage bucket for form uploads
-- Go to: Storage > Create a new bucket
-- Bucket name: form-uploads
-- Public bucket: NO (we'll use signed URLs)

-- 2. Set up Storage Policies (run in SQL Editor after creating bucket)

-- Allow authenticated users to upload files
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can upload to published forms
CREATE POLICY "Public can upload files to form responses"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'form-uploads' AND
  (storage.foldername(name))[1] = 'responses'
);

-- =========================================
-- PUBLIC ASSETS BUCKET (for form images)
-- =========================================

-- 3. Create a public bucket for form assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-assets', 'form-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public can view form assets
CREATE POLICY "Public can view form assets"
ON storage.objects FOR SELECT
USING ( bucket_id = 'form-assets' );

-- Policy: Form owners can upload form assets
CREATE POLICY "Users can upload form assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'form-assets' AND
  auth.uid() = (
    SELECT user_id FROM public.forms
    WHERE id::text = (storage.foldername(name))[2]
  )
);

-- Policy: Form owners can delete form assets
CREATE POLICY "Users can delete form assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'form-assets' AND
  auth.uid() = (
    SELECT user_id FROM public.forms
    WHERE id::text = (storage.foldername(name))[2]
  )
);

-- (Keep existing form-uploads policies below)

-- Policy: Form owners can upload files (for form assets like images)
-- (DEPRECATED: Use form-assets bucket instead)
CREATE POLICY "Users can upload their form assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'form-uploads' AND
  auth.uid() = (
    SELECT user_id FROM public.forms
    WHERE id::text = (storage.foldername(name))[2]
  )
);

-- Policy: Form owners can read their form uploads
CREATE POLICY "Users can read their form uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'form-uploads' AND
  auth.uid() IN (
    SELECT user_id FROM public.forms
    WHERE id::text = (storage.foldername(name))[2]
  )
);

-- ... (previous content)

-- =========================================
-- 5. Profiles (User Roles & Departments)
-- =========================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    department TEXT,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('SUPER_USER', 'USER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Super Users can view all profiles
CREATE POLICY "Super Users can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'SUPER_USER'
        )
    );

-- Super Users can update any profile (e.g. promote/demote)
CREATE POLICY "Super Users can update profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'SUPER_USER'
        )
    );

-- Trigger to create profile on signup (Optional, but good for default)
-- For this app, Admin creates users, so we can handle profile creation in the Server Action.

-- =========================================
-- UPDATE FORMS POLICIES FOR SUPER USER
-- =========================================
-- Drop existing restrictive policies to replace with "User OR Super User" logic if needed.
-- Or simply add a new policy for Super Users.

CREATE POLICY "Super Users can view all forms" ON public.forms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'SUPER_USER'
        )
    );

CREATE POLICY "Super Users can delete all forms" ON public.forms
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'SUPER_USER'
        )
    );

