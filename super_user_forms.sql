-- Ensure Super Users have full access to forms

-- 1. VIEW (SELECT) - Already likely covered, but reinforcing
DROP POLICY IF EXISTS "Super Users can view all forms" ON public.forms;
CREATE POLICY "Super Users can view all forms" ON public.forms
    FOR SELECT USING (
        public.is_super_user()
    );

-- 2. UPDATE
DROP POLICY IF EXISTS "Super Users can update all forms" ON public.forms;
CREATE POLICY "Super Users can update all forms" ON public.forms
    FOR UPDATE USING (
        public.is_super_user()
    );

-- 3. DELETE
DROP POLICY IF EXISTS "Super Users can delete all forms" ON public.forms;
CREATE POLICY "Super Users can delete all forms" ON public.forms
    FOR DELETE USING (
        public.is_super_user()
    );

-- 4. INSERT
-- Standard users can insert (checked against auth.uid = user_id)
-- Super users might want to insert on behalf of others? Or just for themselves.
-- Usually "Users can create their own forms" is sufficient if Super User creates form as themselves.
-- If they need to create as OTHERS, we'd need a policy. For now, assuming they create as themselves is fine.
