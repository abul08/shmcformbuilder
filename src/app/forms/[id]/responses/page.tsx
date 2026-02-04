import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ChevronLeft, Download, LayoutDashboard, MessageSquare, Table, FileText, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ResponsesTable from '@/components/ResponsesTable'

export default async function ResponsesPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('*, form_fields(*)')
    .eq('id', id)
    .single()

  if (formError || !form) {
    notFound()
  }

  const { data: responses, error: responsesError } = await supabase
    .from('form_responses')
    .select('*, form_answers(*)')
    .eq('form_id', id)
    .order('submitted_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <nav className="border-b border-white/10 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-40 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
              <Link
                href={`/forms/${form.id}/edit`}
                className="h-9 w-9 rounded-md hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                title="Back to Editor"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="h-6 w-px bg-white/10 shrink-0" />
              <div className="flex flex-col overflow-hidden">
                <h1 className="font-bold text-sm sm:text-base text-white truncate max-w-[150px] sm:max-w-md">
                  {form.title}
                </h1>
                <span className="text-xs text-gray-400 hidden sm:block">Responses</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link
                href={`/forms/${form.id}/edit`}
                className="hidden sm:flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Back to Editor
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow container mx-auto max-w-7xl px-4 py-10 sm:py-12">
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3 text-white">
                <div className="bg-primary/10 p-2 rounded-lg ring-1 ring-primary/20">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                {responses?.length || 0} Submissions
              </h2>
              <p className="text-gray-400 mt-2">Real-time data from your published form.</p>
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <ResponsesTable 
              form={form} 
              fields={form.form_fields || []} 
              responses={responses || []} 
            />
          </div>
        </div>
      </main>
    </div>
  )
}
