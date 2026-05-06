import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── Per-request nonce-based CSP ──────────────────────────────────────────────
// A fresh cryptographic nonce is generated for every request.
// Next.js App Router reads `x-nonce` from the request headers and automatically
// adds nonce="{nonce}" to every inline <script> it emits for hydration.
// Combined with 'strict-dynamic', this removes the need for 'unsafe-inline'.
function buildCSP(nonce: string): string {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  const directives: string[] = [
    `default-src 'self'`,
    // nonce covers Next.js hydration scripts; strict-dynamic covers scripts
    // they load. No 'unsafe-inline' needed on modern browsers.
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    // Styles: 'unsafe-inline' is accepted for style-src (much lower risk than script)
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    // blob: for file previews; data: for inline images; *.supabase.co covers
    // Supabase Storage public URLs and CDN; https: allows any admin-configured
    // external image URL (images cannot execute code, so https: is safe here)
    `img-src 'self' data: blob: https://*.supabase.co https:`,
    // Supabase REST + Realtime (HTTP and WebSocket)
    // wss: needed for Supabase Realtime; https: needed for Server Action POSTs
    `connect-src 'self' ${SUPABASE_URL} https://*.supabase.co wss://*.supabase.co https:`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    // NOTE: upgrade-insecure-requests intentionally omitted — it interferes with
    // Next.js Server Action POSTs in some production proxy setups.
  ]

  return directives.join('; ')
}

// ─── All other security headers (non-CSP) ────────────────────────────────────
function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none')
  return response
}

export async function updateSession(request: NextRequest) {
  // 1. Generate a fresh nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCSP(nonce)

  // 2. Build modified request headers that carry the nonce.
  //    Next.js reads 'x-nonce' and stamps it on all inline hydration <script> tags.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // 3. Create the initial Supabase response using the nonce-carrying headers.
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const isProduction = process.env.NODE_ENV === 'production'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
        secure: isProduction,     // Secure flag required on HTTPS (production)
        path: '/',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Re-create the response — MUST reuse requestHeaders so the nonce survives.
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 4. Refresh the Supabase auth token and get user
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
  } catch (e) {
    console.error('Middleware Supabase Auth Error:', e)
  }

  const { pathname } = request.nextUrl

  // 5. Route protection
  const isAuthRoute = pathname.startsWith('/login')
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/forms')

  // Unauthenticated user trying to access a protected route → send to /login
  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    const redirectResponse = NextResponse.redirect(loginUrl)
    // Carry any cookies that were set during getUser() onto the redirect
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return applySecurityHeaders(redirectResponse, csp)
  }

  // Authenticated user trying to visit /login → send to /dashboard
  if (user && isAuthRoute) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    const redirectResponse = NextResponse.redirect(dashboardUrl)
    // Carry any cookies that were set during getUser() onto the redirect
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return applySecurityHeaders(redirectResponse, csp)
  }

  // 6. Stamp all security headers (including nonce CSP) onto the response
  return applySecurityHeaders(supabaseResponse, csp)
}
