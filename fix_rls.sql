-- Fix RLS for Public Form Submissions

-- 1. Ensure 'anon' and 'authenticated' can insert into form_responses
DROP POLICY IF EXISTS "Public can insert responses" ON public.form_responses;
CREATE POLICY "Public can insert responses" ON public.form_responses
    FOR INSERT WITH CHECK (
        -- Check if the related form is published
        EXISTS (
            SELECT 1 FROM public.forms
            WHERE forms.id = form_responses.form_id
            AND forms.is_published = true
        )
    );

-- 2. Ensure 'anon' and 'authenticated' can insert into form_answers
DROP POLICY IF EXISTS "Public can insert answers" ON public.form_answers;
CREATE POLICY "Public can insert answers" ON public.form_answers
    FOR INSERT WITH CHECK (
        -- Check if the related response belongs to a published form
        EXISTS (
            SELECT 1 FROM public.form_responses
            JOIN public.forms ON forms.id = form_responses.form_id
            WHERE form_responses.id = form_answers.response_id
            AND forms.is_published = true
        )
    );

-- 3. Grant necessary permissions to anon role (just in case they are missing)
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON TABLE public.form_responses TO anon;
GRANT ALL ON TABLE public.form_answers TO anon;
-- Also need SELECT on forms to check is_published
GRANT SELECT ON TABLE public.forms TO anon;
-- And SELECT on form_fields to validate answers? Not strictly for insert, but good practice.
GRANT SELECT ON TABLE public.form_fields TO anon;

-- 4. Ensure Public can view published forms (SELECT) is correct
DROP POLICY IF EXISTS "Public can view published forms" ON public.forms;
CREATE POLICY "Public can view published forms" ON public.forms
    FOR SELECT USING (is_published = true);

-- 5. Ensure Public can view fields of published forms
DROP POLICY IF EXISTS "Public can view fields of published forms" ON public.form_fields;
CREATE POLICY "Public can view fields of published forms" ON public.form_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.forms
            WHERE forms.id = form_fields.form_id
            AND forms.is_published = true
        )
    );
