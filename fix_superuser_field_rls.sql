-- Allow Super Users to manage (CRUD) all fields
-- This fixes the issue where an Admin/Super User cannot add/edit/delete fields on a form they do not own (e.g. assigned to someone else).

CREATE POLICY "Super Users can manage all fields" ON public.form_fields
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'SUPER_USER'
        )
    );

-- Also allow Super Users to manage answers (if needed for editing responses)
CREATE POLICY "Super Users can manage all answers" ON public.form_answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'SUPER_USER'
        )
    );

-- Also allow Super Users to manage responses (e.g. delete)
-- (Note: responses.ts uses admin client for deletion, so this might be redundant but good for consistency if we switch to client-side logic later)
CREATE POLICY "Super Users can manage all responses" ON public.form_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'SUPER_USER'
        )
    );
