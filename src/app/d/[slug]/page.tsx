import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DhivehiPublicForm from '@/components/DhivehiPublicForm'
import { ToastProvider } from '@/components/ui/toast'
import { Form, FormField } from '@/types'

export const dynamic = 'force-dynamic'

export default async function DhivehiPublicFormPage({ params }: { params: { slug: string } }) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: form, error } = await supabase
        .from('forms')
        .select('*, form_fields(*)')
        .eq('slug', slug)
        .single()

    if (error || !form) {
        notFound()
    }

    // security check: if not published, must be owner
    if (!form.is_published) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.id !== form.user_id) {
            notFound()
        }
    }

    const sortedFields = (form.form_fields || []).sort((a: any, b: any) => a.order_index - b.order_index)

    const isClosed = !form.is_accepting_responses || (form.closes_at && new Date() > new Date(form.closes_at))

    if (isClosed) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 font-waheed" dir="rtl">
                <div className="max-w-md w-full bg-white/5 rounded-lg border border-white/10 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="mx-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
                    </div>
                    <h1 className="text-xl font-semibold text-white mb-2">ފޯމު ބަންދުވެއްޖެ</h1>
                    <p className="text-gray-400">
                        މި ފޯމަށް އިތުރު ޖަވާބެއް ބަލައެއް ނުގަނެވޭނެ.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 font-waheed" dir="rtl">
            <div className="mx-auto max-w-3xl">
                <ToastProvider>
                    <DhivehiPublicForm
                        form={form}
                        fields={sortedFields}
                        className="font-waheed text-right"
                    />
                </ToastProvider>
            </div>
        </div>
    )
}
