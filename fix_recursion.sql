-- 1. Create a helper function to check Super User status without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_super_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'SUPER_USER'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Profiles Policies to use the function
DROP POLICY IF EXISTS "Super Users can view all profiles" ON public.profiles;
CREATE POLICY "Super Users can view all profiles" ON public.profiles
    FOR SELECT USING (
        public.is_super_user()
    );

DROP POLICY IF EXISTS "Super Users can update profiles" ON public.profiles;
CREATE POLICY "Super Users can update profiles" ON public.profiles
    FOR UPDATE USING (
        public.is_super_user()
    );

-- 3. Update Forms Policies (Optional, but good for consistency)
DROP POLICY IF EXISTS "Super Users can view all forms" ON public.forms;
CREATE POLICY "Super Users can view all forms" ON public.forms
    FOR SELECT USING (
        public.is_super_user()
    );

DROP POLICY IF EXISTS "Super Users can delete all forms" ON public.forms;
CREATE POLICY "Super Users can delete all forms" ON public.forms
    FOR DELETE USING (
        public.is_super_user()
    );
