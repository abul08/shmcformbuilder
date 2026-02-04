'use client'

import { useState } from 'react'
import { Plus, Loader2, CheckCircle2 } from 'lucide-react'
import { createForm } from '@/actions/forms'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface CreateFormButtonProps {
    variant?: 'default' | 'fab'
}

export default function CreateFormButton({ variant = 'default' }: CreateFormButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const { addToast } = useToast()
    const router = useRouter()

    const handleCreate = async (language: 'en' | 'dv') => {
        if (isLoading) return
        setIsLoading(true)
        try {
            const formData = new FormData()
            formData.append('language', language)

            const result = await createForm(formData)

            if (result?.error) {
                console.error('Failed to create form:', result.error)
                addToast(result.error, 'error')
                setIsLoading(false)
            } else if (result?.success && result?.id) {
                // Success - redirect to the new form
                router.push(`/forms/${result.id}/edit`)
                setIsOpen(false)
            }
        } catch (error) {
            console.error('Failed to create form:', error)
            addToast('Failed to create form. Please try again.', 'error')
            setIsLoading(false)
        }
    }

    const TriggerButton = variant === 'fab' ? (
        <button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full bg-primary text-white shadow-2xl hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors flex items-center justify-center"
            aria-label="Create new form"
        >
            <Plus className="h-6 w-6" />
        </button>
    ) : (
        <button
            onClick={() => setIsOpen(true)}
            className="w-full sm:w-auto rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors flex items-center justify-center"
        >
            <Plus className="h-4 w-4 mr-2 -mt-0.5" />
            Create New Form
        </button>
    )

    return (
        <>
            {TriggerButton}

            <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
                <DialogContent className="sm:max-w-md bg-gray-900 border-white/10 text-white text-center">
                    <DialogHeader>
                        <DialogTitle>Choose Form Language</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Select the primary language for your form. This cannot be changed later.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <button
                            onClick={() => handleCreate('en')}
                            disabled={isLoading}
                            className="flex flex-col items-center justify-center p-6 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <h3 className="font-semibold text-xl text-white group-hover:text-primary transition-colors mb-1">English Form</h3>
                            <p className="text-sm text-gray-400">Standard left-to-right English editor</p>
                        </button>

                        <button
                            onClick={() => handleCreate('dv')}
                            disabled={isLoading}
                            className="flex flex-col items-center justify-center p-6 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <h3 className="text-2xl text-white group-hover:text-primary transition-colors font-waheed mb-1">ދިވެހި ފޯމު</h3>
                            <p className="text-sm text-gray-400">Right-to-left Dhivehi editor</p>
                        </button>
                    </div>

                    {isLoading && (
                        <div className="flex justify-center pb-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
