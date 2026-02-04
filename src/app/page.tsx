import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { LayoutDashboard, CheckSquare, Shield, Zap, ArrowRight, Github } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // if (user) {
  //   redirect('/dashboard')
  // }

  const { data: forms } = await supabase
    .from('forms')
    .select('id, title, description, slug')
    .eq('is_published', true)
    .order('created_at', { ascending: false })


  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <main className="flex-grow bg-gray-900">
        <section className="py-10 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 border-b border-white/10 pb-6 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">Available Forms</h1>
                <p className="text-gray-400 mt-2">Public forms open for submissions</p>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms?.map((form) => (
                <Link key={form.id} href={`/f/${form.slug}`} className="block group">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
                    <h3 className="text-xl  text-gray-700 mb-2 group-hover:text-primary transition-colors font-waheedh" dir="auto">{form.title}</h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-grow font-faruma" dir="auto">{form.description || 'No description provided.'}</p>
                    <div className="flex items-center text-primary text-sm font-medium mt-auto">
                      Fill Form <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
              {(!forms || forms.length === 0) && (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                  <p className=' font-waheed' dir="rtl">މިވަގުތު އެއްވެސް ފޯރމް ޢާންމުކުރެވިފައެއް ނުވެއެވެ.</p>
                  <p>No public forms available at the moment.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
