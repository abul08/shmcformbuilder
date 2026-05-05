/** @type {import('next').NextConfig} */

// ─── Supabase project domain ─────────────────────────────────────────────────
// Used in CSP connect-src and img-src so Supabase API calls and storage images work.
const SUPABASE_URL = 'https://hwncbcjvitkoawcuefhe.supabase.co'
const SUPABASE_STORAGE = 'https://hwncbcjvitkoawcuefhe.supabase.co/storage/v1'

// ─── Content Security Policy ──────────────────────────────────────────────────
// Next.js App Router requires 'unsafe-inline' for style-src (CSS-in-JS / Tailwind)
// and 'unsafe-eval' is NOT needed with the App Router in production.
// 'self' covers all same-origin assets. Nonces would be ideal but require
// additional middleware complexity; 'unsafe-inline' is the pragmatic choice here.
const cspDirectives = {
  'default-src':  ["'self'"],
  'script-src':   ["'self'", "'unsafe-inline'"],   // Next.js inline hydration scripts
  'style-src':    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src':     ["'self'", 'https://fonts.gstatic.com', 'data:'],
  'img-src':      ["'self'", 'data:', 'blob:', SUPABASE_STORAGE],
  'connect-src':  [
    "'self'",
    SUPABASE_URL,
    'https://*.supabase.co',           // Realtime / Auth endpoints
    'wss://*.supabase.co',             // Supabase Realtime WebSocket
  ],
  'frame-src':    ["'none'"],           // no iframes allowed from this origin
  'object-src':   ["'none'"],
  'base-uri':     ["'self'"],
  'form-action':  ["'self'"],
  'upgrade-insecure-requests': [],     // force HTTPS for all sub-requests
}

const cspHeader = Object.entries(cspDirectives)
  .map(([directive, sources]) =>
    sources.length
      ? `${directive} ${sources.join(' ')}`
      : directive
  )
  .join('; ')

// ─── Security headers applied to every route ─────────────────────────────────
const securityHeaders = [
  // 1. Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: cspHeader,
  },
  // 2. Prevent MIME-type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // 3. Deny this app being loaded in any iframe (clickjacking protection)
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // 4. Cross-Origin Resource Policy — only same-origin fetches of our resources
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
  // ── Bonus headers (best-practice additions) ───────────────────────────────
  // Referrer: don't leak full URL to third parties
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // HSTS: enforce HTTPS for 1 year (including sub-domains)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // Permissions: opt out of browser features this app doesn't need
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Modern replacement for X-Frame-Options (also blocks embedding in frames)
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  // Prevent cross-origin reads of our responses
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'unsafe-none',              // 'require-corp' would break Supabase storage previews
  },
]

const nextConfig = {
  headers: async () => [
    {
      // Apply to all routes
      source: '/(.*)',
      headers: securityHeaders,
    },
  ],
}

module.exports = nextConfig
