-- 5. Profiles (User Roles & Departments)
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

-- Super Users can view all forms
CREATE POLICY "Super Users can view all forms" ON public.forms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'SUPER_USER'
        )
    );

-- Super Users can delete all forms
CREATE POLICY "Super Users can delete all forms" ON public.forms
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'SUPER_USER'
        )
    );
