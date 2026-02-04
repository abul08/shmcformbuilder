'use client';

import { useEffect, useState } from 'react';

export default function DebugEnv() {
    const [envStatus, setEnvStatus] = useState<any>({});

    useEffect(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

        const isValidChar = /^[A-Za-z0-9\-_]+$/.test(key || '');

        setEnvStatus({
            url: url ? `${url.substring(0, 10)}...` : 'MISSING',
            key: key ? `${key.substring(0, 5)}...${key.substring(key.length - 5)}` : 'MISSING',
            keyLength: key ? key.length : 0,
            isValidChar
        });

        console.log('Debug Env:', {
            url,
            key: key ? 'PRESENT (hidden)' : 'MISSING',
            isValidChar
        });
    }, []);

    return (
        <div className="fixed top-0 left-0 bg-black/80 text-white p-2 z-[9999] text-xs font-mono border-b border-red-500 w-full text-center">
            DEBUG: URL: {envStatus.url} | KEY: {envStatus.key} (Len: {envStatus.keyLength})
            {!envStatus.isValidChar && envStatus.key !== 'MISSING' && (
                <span className="text-red-500 font-bold ml-2"> [INVALID CHARS DETECTED]</span>
            )}
            <br />
            If KEY is MISSING or invalid, Supabase calls will fail.
        </div>
    );
}
