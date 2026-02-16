import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { LayoutDashboard, CheckSquare, Shield, Zap, ArrowRight, Github } from 'lucide-react'

import PublicLogoHeader from '@/components/PublicLogoHeader'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: forms } = await supabase
    .from('forms')
    .select('id, title, description, slug, settings, published_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })


  return (
    <div className="min-h-screen bg-gray-900 flex flex-col pr-2 pl-2">
      <main className="flex-grow bg-gray-900">
        <section className="py-5 px-4">
          <div className="max-w-7xl mx-auto">
            <PublicLogoHeader />
            <div className="flex flex-col md:flex-row sm:justify-end justify-center mb-10 border-b border-white/10 pb-6 gap-4">
              <div>
                <h1 className="text-3xl sm:text-right text-center font-waheed text-gray-400">ފޯމުތައް</h1>
                <p className="text-gray-600 mt-2 text-2xl sm:text-right text-center font-waheed">އާއްމުކޮށް ހުޅުވާލާފައިވާ ފޯމުތައް</p>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" dir="rtl">
              {forms?.map((form) => {
                const isDhivehiTitle = /[\u0780-\u07BF]/.test(form.title || '');
                const titleClass = isDhivehiTitle ? 'font-waheed text-right text-2xl' : 'font-inter text-left text-xl font-medium';

                const isDhivehiDesc = /[\u0780-\u07BF]/.test(form.description || '');
                const descClass = isDhivehiDesc ? 'font-faruma text-right leading-relaxed' : 'font-inter text-left';

                return (
                  <Link key={form.id} href={`/f/${form.slug}`} className="block group">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
                      {(form.settings as any)?.form_type && (
                        <div className="flex justify-between items-start mb-1">
                          <div className={`text-md text-gray-500 opacity-75 ${(form.settings as any)?.form_type && /[\u0780-\u07BF]/.test((form.settings as any).form_type) ? 'font-faruma text-right text-lg' : 'font-inter font-medium text-left'}`}>
                            {(form.settings as any).form_type}
                          </div>
                          {form.published_at && (
                            <span className="text-xs text-gray-500 font-inter">
                              {new Date(form.published_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}

                      <h3 className={` text-gray-400 mb-2 group-hover:text-primary transition-colors pr-1 ${titleClass}`} dir="auto">{form.title}</h3>
                      <div className={`flex items-center text-primary opacity-85   mt-auto ${isDhivehiTitle ? ' font-waheed pr-1 pt-2 text-lg' : 'font-medium text-right text-sm flex-row-reverse'}`}>
                        {isDhivehiTitle ? 'ފޯމު ފުރާ' : 'Fill Form'} <ArrowRight className={`h-4 w-4 ml-2  transition-transform  ${isDhivehiTitle ? 'rotate-180 mr-2 ml-0 group-hover:translate-x-[-4px]' : 'group-hover:translate-x-1'}`} />
                      </div>
                    </div>
                  </Link>
                )
              })}
              {(!forms || forms.length === 0) && (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                  <p className=' font-waheed' dir="rtl">މިވަގުތު އެއްވެސް ފޯރމް ޢާންމުކުރެވިފައެއް ނުވެއެވެ.</p>
                  <p className='text-sm'>No public forms available at the moment.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
