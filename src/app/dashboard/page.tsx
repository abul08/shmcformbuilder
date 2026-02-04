import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, LayoutDashboard, LogOut, Search, Filter, Shield } from 'lucide-react'
import { createForm } from '@/actions/forms'
import { logout } from '@/actions/auth'
import FormList from '@/components/FormList'
import CreateFormButton from '@/components/CreateFormButton'
import { Input } from '@/components/ui/input'

export default async function DashboardPage() {
  const supabase = await createClient()
  // 1. Get User
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Get Profile to check Role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, department')
    .eq('id', user.id)
    .single()

  const isSuperUser = profile?.role === 'SUPER_USER'

  // 3. Construct Query
  let query = supabase
    .from('forms')
    .select('*, form_responses(count)')
    .order('created_at', { ascending: false })

  // If NOT Super User, filter by own forms
  if (!isSuperUser) {
    query = query.eq('user_id', user.id)
  }

  const { data: forms, error } = await query



  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <nav className="border-b border-white/10 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-10 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary p-1.5 rounded-lg shadow-sm">
                <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-wide text-white">SHMC FormBuilder</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {isSuperUser && (
                <a
                  href="/admin"
                  className="hidden sm:flex items-center gap-2 rounded-md bg-purple-500/10 px-3 py-1.5 text-sm font-semibold text-purple-400 hover:bg-purple-500/20 transition-colors border border-purple-500/20"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </a>
              )}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-white">{profile?.full_name || 'User'}</span>
                {profile?.department && <span className="text-xs text-gray-400">{profile.department}</span>}
              </div>
              <div className="h-8 w-px bg-white/10 hidden sm:block" />
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  <LogOut className="h-4 w-4 sm:mr-2 inline" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow container mx-auto max-w-7xl px-4 py-10 sm:py-12">
        <div className="space-y-8">
          {/* Hero/Stats Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Your Forms</h1>
              <p className="text-gray-400 mt-1">Create, manage and share your forms.</p>
            </div>
            <div className="w-full sm:w-auto">
              <CreateFormButton />
            </div>
          </div>

          {/* Filters/Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search forms..."
                className="block w-full rounded-md bg-white/5 pl-10 pr-3 py-2 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm"
              />
            </div>
            <button
              type="button"
              className="shrink-0 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2 inline -mt-0.5" />
              Filter
            </button>
          </div>

          {/* Form Grid */}
          <div>
            {error ? (
              <div className="rounded-lg bg-red-500/10 px-4 py-6 ring-1 ring-inset ring-red-500/20 text-center">
                <p className="font-semibold text-red-400">Failed to load forms</p>
                <p className="text-sm text-red-400/80 mt-2">{error.message}</p>
                <a
                  href="/dashboard"
                  className="mt-4 inline-block rounded-md bg-red-500/20 px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/30"
                >
                  Try Again
                </a>
              </div>
            ) : (
              <FormList initialForms={forms || []} />
            )}
          </div>
        </div>
      </main>


    </div>
  )
}
