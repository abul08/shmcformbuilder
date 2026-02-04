const fs = require('fs');
const path = require('path');

console.log('Verifying .env.local file...');

const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local file not found!');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

let hasServiceKey = false;
let hasAnonKey = false;
let hasUrl = false;

lines.forEach(line => {
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        hasServiceKey = true;
        if (line.split('=')[1].trim().length < 10) {
            console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY seems too short.');
        } else {
            console.log('SUPABASE_SERVICE_ROLE_KEY is present.');
        }
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) hasAnonKey = true;
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) hasUrl = true;
});

if (!hasServiceKey) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is MISSING in .env.local');
}
if (!hasAnonKey) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is MISSING in .env.local');
}
if (!hasUrl) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is MISSING in .env.local');
}

if (hasServiceKey && hasAnonKey && hasUrl) {
    console.log('Keys are present. Attempting to connect...');

    try {
        const { createClient } = require('@supabase/supabase-js');

        // Parse the env content simple way
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

        if (!supabaseUrl || !serviceKey) {
            console.error('Failed to parse URL or Key');
            process.exit(1);
        }

        const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
        if (!anonKey) {
            console.error('Anon key missing');
        }

        console.log('Testing Service Role Key...');
        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Try to fetch one row from 'forms' (admin access)
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

        // Try to fetch something public or just check connection. 
        // We'll try to select from forms (might fail RLS but shouldn't be "Invalid API key")
        const check2 = await supabaseAnon.from('forms').select('count', { count: 'exact', head: true });

        if (check2.error) {
            console.log('Anon Key Request Result:', check2.error.message);
            // If message is "Invalid API key", we found the culprit.
            if (check2.error.message.includes('Invalid API key')) {
                console.error('CRITICAL: The Anon Key is INVALID.');
            }
        } else {
            console.log('Anon Key seems to work (RLS permitted or open).');
        }

    } catch (e) {
        console.error('Script Error:', e.message);
    }
}
