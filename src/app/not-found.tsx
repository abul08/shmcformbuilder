import Link from 'next/link'
import { FileQuestion, Home } from 'lucide-react'
import PublicLogoHeader from '@/components/PublicLogoHeader'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col pr-2 pl-2">
      <main className="flex-grow flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center">
          <div className="mb-12 w-full">
            <PublicLogoHeader />
          </div>

          <div className="bg-primary/10 p-6 rounded-full ring-1 ring-primary/20 mb-8">
            <FileQuestion className="h-16 w-16 text-primary" />
          </div>

          <h1 className="text-6xl font-bold tracking-tight text-white font-sans mb-4">404</h1>

          <div className="space-y-6 mb-12 w-full">
            <div>
              <h2 className="text-2xl text-gray-300 font-waheed">ސަފުޙާ ނުފެނުނު</h2>
              <p className="text-gray-500 font-faruma text-lg mt-2" dir='rtl'>
                ތިޔަ ހޯއްދަވާ ސަފުޙާ ނުވަތަ ފޯމު ފެންނާކަށް ނެތް. ލިންކް ރަނގަޅުތޯ ޗެކްކުރައްވާ.
              </p>
            </div>

            <div className="pt-6 border-t border-white/10">
              <h2 className="text-xl text-gray-300 font-inter font-medium">Page Not Found</h2>
              <p className="text-gray-500 font-inter mt-2">
                The page or form you are looking for does not exist. Please check the URL.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-3 rounded-lg bg-primary px-8 pb-3 pt-4 text-lg text-white shadow-sm hover:bg-primary/90 transition-all font-waheed hover:scale-105 active:scale-95"
            >
              މައި ސަފުޙާއަށް
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
