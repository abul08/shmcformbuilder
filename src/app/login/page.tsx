'use client'

import { useState } from 'react'
import { login, signup } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard, Mail, Lock, ArrowRight, Loader2, Github, Chrome } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setMessage(null)
    setLoading(true)

    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 sm:p-6">
      <Link href="/" className="flex items-center gap-2.5 mb-10 group hover:scale-105 transition-transform">
        <div className="bg-primary p-1.5 rounded-lg shadow-lg shadow-primary/20">
          <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-black tracking-tight text-white">SHMC FormBuilder</span>
      </Link>

      <div className="w-full max-w-md rounded-lg bg-white/5 ring-1 ring-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="border-b border-white/10 px-8 py-6">
          <h2 className="text-xl font-semibold text-white text-center">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-gray-400 text-center">
            Sign in to access your forms and responses
          </p>
        </div>

        <div className="p-8">
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm/6 font-medium text-white">
                Username
              </label>
              <div className="mt-2 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Username"
                  className="block w-full rounded-md bg-white/5 pl-10 pr-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm/6 font-medium text-white">
                  Password
                </label>
              </div>
              <div className="mt-2 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="block w-full rounded-md bg-white/5 pl-10 pr-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-500/10 px-3 py-2 ring-1 ring-inset ring-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {message && (
              <div className="rounded-md bg-green-500/10 px-3 py-2 ring-1 ring-inset ring-green-500/20">
                <p className="text-sm text-green-400">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}
