import Image from 'next/image'
import shmcLogo from '@/app/img/shmc-logo.svg'

export default function PublicLogoHeader() {
    return (
        <div className="flex justify-center mb-8 border-b border-white/10 pb-6">
            <Image
                src={shmcLogo}
                alt="SHMC Logo"
                width={200}
                height={200}
                className="h-20 sm:h-24 w-auto object-contain opacity-50 mt-6"
            />
        </div>
    )
}
