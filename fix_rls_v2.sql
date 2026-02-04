-- Fix RLS for Public Form Submissions (V2 - Robust)

-- 1. Create a secure function to check publication status
-- This bypasses RLS on the forms table to avoid permission issues during the check
CREATE OR REPLACE FUNCTION public.is_form_published(target_form_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
SET search_path = public -- Secure search path
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.forms
        WHERE id = target_form_id
        AND is_published = true
    );
END;
$$;

-- 2. Create a secure function to check response validity for answers
CREATE OR REPLACE FUNCTION public.is_response_linked_to_published_form(target_response_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.form_responses
        JOIN public.forms ON forms.id = form_responses.form_id
        WHERE form_responses.id = target_response_id
        AND forms.is_published = true
    );
END;
$$;

-- Grant execute to everyone
GRANT EXECUTE ON FUNCTION public.is_form_published TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_response_linked_to_published_form TO anon, authenticated, service_role;

-- 3. Update Form Responses Policy
DROP POLICY IF EXISTS "Public can insert responses" ON public.form_responses;
CREATE POLICY "Public can insert responses" ON public.form_responses
    FOR INSERT WITH CHECK (
        public.is_form_published(form_id)
    );

-- 4. Update Form Answers Policy
DROP POLICY IF EXISTS "Public can insert answers" ON public.form_answers;
CREATE POLICY "Public can insert answers" ON public.form_answers
    FOR INSERT WITH CHECK (
        public.is_response_linked_to_published_form(response_id)
    );

-- 5. Grant necessary permissions (Idempotent)
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON TABLE public.form_responses TO anon;
GRANT ALL ON TABLE public.form_answers TO anon;
GRANT SELECT ON TABLE public.forms TO anon;
GRANT SELECT ON TABLE public.form_fields TO anon;

-- 6. Ensure Public can view published forms (SELECT)
DROP POLICY IF EXISTS "Public can view published forms" ON public.forms;
CREATE POLICY "Public can view published forms" ON public.forms
    FOR SELECT USING (is_published = true);

-- 7. Ensure Public can view fields of published forms
DROP POLICY IF EXISTS "Public can view fields of published forms" ON public.form_fields;
CREATE POLICY "Public can view fields of published forms" ON public.form_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.forms
            WHERE forms.id = form_fields.form_id
            AND forms.is_published = true
        )
    );
