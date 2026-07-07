import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import EnglishPublicForm from '@/components/EnglishPublicForm'
import DhivehiPublicForm from '@/components/DhivehiPublicForm'
import { ToastProvider } from '@/components/ui/toast'
import { Metadata, ResolvingMetadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: form } = await supabase
    .from('forms')
    .select('title, description, is_published')
    .eq('slug', slug)
    .single()

  if (!form) {
    return {
      title: 'Form Not Found',
    }
  }

  const title = form.title || 'SHMC Form'
  const description = form.description || 'View and fill out this form.'

  // Use absolute URL for the image if we have VERCEL_URL or NEXT_PUBLIC_SITE_URL, 
  // otherwise it will default to relative (which often works with next/og, but let's be robust)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

  const ogUrl = `${baseUrl}/api/og?title=${encodeURIComponent(title)}&desc=${encodeURIComponent(description)}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
  }
}

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: { slug: string },
  searchParams?: { preview?: string },
}) {
  const { slug } = await params
  const query = await searchParams
  const isPreview = query?.preview === '1'
  const supabase = await createClient()
  const { data: { user } } = isPreview
    ? await supabase.auth.getUser()
    : { data: { user: null } }

  const { data: profile } = user
    ? await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    : { data: null }

  const isSuperUser = profile?.role === 'SUPER_USER'
  const readClient = isPreview && isSuperUser ? await createAdminClient() : supabase

  const { data: form, error } = await readClient
    .from('forms')
    .select('*, form_fields(*)')
    .eq('slug', slug)
    .single()

  if (error || !form) {
    notFound()
  }

  // security check: if not published, must be owner
  if (!form.is_published) {
    if (!user || (user.id !== form.user_id && !isSuperUser)) {
      notFound()
    }
  }

  const sortedFields = (form.form_fields || []).sort((a: any, b: any) => a.order_index - b.order_index)

  const isClosed = !isPreview && (!form.is_accepting_responses || (form.closes_at && new Date() > new Date(form.closes_at)))

  if (isClosed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/5 rounded-lg border border-white/10 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Form Closed</h1>
          <p className="text-gray-400">
            This form is currently not accepting responses.
          </p>
        </div>
      </div>
    )
  }

  const isDhivehi = form.settings?.language === 'dv'

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-2 sm:px-2">
      <div className="mx-auto max-w-3xl">
        <ToastProvider>
          {isDhivehi ? (
            <DhivehiPublicForm form={form} fields={sortedFields} isPreview={isPreview} />
          ) : (
            <EnglishPublicForm form={form} fields={sortedFields} isPreview={isPreview} />
          )}
        </ToastProvider>
      </div>
    </div>
  )
}
