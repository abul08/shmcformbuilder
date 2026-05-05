/** @type {import('next').NextConfig} */

// ─── Static security headers (non-CSP) ───────────────────────────────────────
// The Content-Security-Policy is intentionally NOT set here.
// It is generated per-request in src/lib/supabase/middleware.ts using a
// cryptographic nonce so that 'unsafe-inline' is never needed in script-src.
//
// These headers are applied at the Next.js level for every route and act as a
// safety net alongside the middleware-injected headers.
const staticSecurityHeaders = [
  // Prevent MIME-type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Deny this app being loaded in any iframe (clickjacking protection)
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Cross-Origin Resource Policy — only same-origin fetches allowed
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
  // Don't leak full URL in Referer header to third parties
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Enforce HTTPS for 1 year (including sub-domains)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // Opt out of browser features this app does not use
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Isolates browsing context from cross-origin windows
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
]

const nextConfig = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: staticSecurityHeaders,
    },
  ],
}

module.exports = nextConfig
