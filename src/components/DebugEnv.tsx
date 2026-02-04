'use client';

import { useEffect, useState } from 'react';

export default function DebugEnv() {
    const [envStatus, setEnvStatus] = useState<any>({});

    useEffect(() => {
        // Attempt to trim keys if they are strings
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

        // Regex allowing A-Z, a-z, 0-9, -, _, and . (for JWT)
        const isValidChar = /^[A-Za-z0-9\-_.]+$/.test(key || '');

        // Get char codes for the last 5 chars to debug hidden characters
        const lastChars = key ? key.substring(key.length - 5) : '';
        const lastCharCodes = lastChars.split('').map(c => c.charCodeAt(0)).join(', ');

        setEnvStatus({
            url: url ? `${url.substring(0, 10)}...` : 'MISSING',
            key: key ? `${key.substring(0, 5)}...${key.substring(key.length - 5)}` : 'MISSING',
            keyLength: key ? key.length : 0,
            isValidChar,
            lastCharCodes
        });

        console.log('Debug Env:', {
            url,
            key: key ? 'PRESENT (hidden)' : 'MISSING',
            isValidChar,
            lastCharCodes
        });
    }, []);

    return (
        <div className="fixed top-0 left-0 bg-black/80 text-white p-2 z-[9999] text-xs font-mono border-b border-red-500 w-full text-center">
            DEBUG: URL: {envStatus.url} | KEY: {envStatus.key} (Len: {envStatus.keyLength})
            {!envStatus.isValidChar && envStatus.key !== 'MISSING' && (
                <span className="text-red-500 font-bold ml-2"> [INVALID CHARS / BAD FORMAT]</span>
            )}
            <div className="text-[10px] text-gray-400">
                Last 5 chars ASCII: [{envStatus.lastCharCodes}]
            </div>
            If KEY is MISSING or invalid, Supabase calls will fail.
        </div>
    );
}
