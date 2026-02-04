const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    console.log('Verifying .env.local file...');

    const envPath = path.join(process.cwd(), '.env.local');

    if (!fs.existsSync(envPath)) {
        console.error('ERROR: .env.local file not found!');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    const env = {};
    lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            env[key] = value;
        }
    });

    const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
    const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];
    const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

    if (!supabaseUrl) console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL missing');
    if (!serviceKey) console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY missing');
    if (!anonKey) console.error('ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY missing');

    if (supabaseUrl && serviceKey && anonKey) {
        console.log('Keys are present.');

        console.log('Testing Service Role Key...');
        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const check1 = await supabaseAdmin.from('forms').select('count', { count: 'exact', head: true });
        if (check1.error) {
            console.error('Service Key Connection Failed:', check1.error.message);
        } else {
            console.log('Service Key Configured Correctly. Form count:', check1.count);
        }

        console.log('Testing Anon Key...');
        const supabaseAnon = createClient(supabaseUrl, anonKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const check2 = await supabaseAnon.from('forms').select('count', { count: 'exact', head: true });

        if (check2.error) {
            console.log('Anon Key Request Result:', check2.error.message);
            if (check2.error.message.includes('Invalid API key')) {
                console.error('CRITICAL: The Anon Key is INVALID.');
            }
        } else {
            console.log('Anon Key seems to work (RLS permitted or open).');
        }
    }
}

main().catch(err => console.error(err));
