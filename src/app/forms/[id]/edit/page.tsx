import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EnglishFormBuilder from '@/components/EnglishFormBuilder'
import DhivehiFormBuilder from '@/components/DhivehiFormBuilder'
import { LayoutDashboard, ChevronLeft, Eye, MessageSquare, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function EditFormPage({ params }: { params: { id: string } }) {
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

  const { count: responseCount } = await supabase
    .from('form_responses')
    .select('*', { count: 'exact', head: true })
    .eq('form_id', id)

  if (formError || !form) {
    notFound()
  }

  const sortedFields = (form.form_fields || []).sort((a: any, b: any) => a.order_index - b.order_index)
  // Default to English if no language is set
  const isDhivehi = form.settings?.language === 'dv'

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Builder Sub-nav */}
      <nav className="border-b border-white/10 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-40 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">

              <div className="flex flex-col overflow-hidden">
                <h1 className="font-bold text-sm sm:text-base text-white truncate max-w-[150px] sm:max-w-md">
                  {form.title}
                </h1>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold hidden sm:block">
                  {isDhivehi ? 'Dhivehi Editor' : 'Form Editor'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              <Button variant="ghost" size="sm" className="hidden md:flex h-9 rounded-md px-4 text-gray-300 hover:text-white hover:bg-white/10" asChild>
                <Link href={`/forms/${form.id}/responses`}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Responses
                  {responseCount !== null && responseCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white leading-none">
                      {responseCount}
                    </span>
                  )}
                </Link>
              </Button>



              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md sm:hidden text-gray-300 hover:text-white" asChild>
                <Link href={`/forms/${form.id}/responses`}>
                  <MessageSquare className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Builder Area */}
      <main className="flex-grow">
        {isDhivehi ? (
          <DhivehiFormBuilder initialForm={form} initialFields={sortedFields} />
        ) : (
          <EnglishFormBuilder initialForm={form} initialFields={sortedFields} />
        )}
      </main>
    </div>
  )
}
