import { createClient } from '@supabase/supabase-js'

export async function createAdminClient() {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[createAdminClient] FATAL: SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables!')
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();



    return createClient(
        url!,
        serviceKey!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
