'use client';

import { useEffect, useState } from 'react';

export default function DebugEnv() {
    const [envStatus, setEnvStatus] = useState<any>({});

    useEffect(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        setEnvStatus({
            url: url ? `${url.substring(0, 10)}...` : 'MISSING',
            key: key ? `${key.substring(0, 5)}...${key.substring(key.length - 5)}` : 'MISSING',
            keyLength: key ? key.length : 0
        });

        console.log('Debug Env:', {
            url,
            key: key ? 'PRESENT (hidden)' : 'MISSING'
        });
    }, []);

    return (
        <div className="fixed top-0 left-0 bg-black/80 text-white p-2 z-[9999] text-xs font-mono border-b border-red-500 w-full text-center">
            DEBUG: URL: {envStatus.url} | KEY: {envStatus.key} (Len: {envStatus.keyLength})
            <br />
            If KEY is MISSING or invalid, Supabase calls will fail.
        </div>
    );
}
