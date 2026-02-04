import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPanel from './AdminPanel'


export default async function AdminPage() {
    const supabase = await createClient()

    // 1. Check Auth & Role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'SUPER_USER') {
        redirect('/dashboard')
    }

    // 2. Fetch All Profile/Users
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <AdminPanel profiles={profiles || []} />
    )
}

