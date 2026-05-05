'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutTemplate, Loader2, X, CheckCircle2, ChevronRight } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { formTemplates, FormTemplate } from '@/lib/formTemplates'
import { createFormFromTemplate } from '@/actions/forms'
import { useToast } from '@/components/ui/toast'

const FIELD_TYPE_LABELS: Record<string, string> = {
    image: '🖼 Image',
    short_text: '✏️ Text',
    long_text: '📄 Long Text',
    number: '🔢 Number',
    dropdown: '🔽 Dropdown',
    radio: '⚪ Single Choice',
    checkbox: '☑️ Multi Choice',
    email: '📧 Email',
    date: '📅 Date',
    file: '📎 File',
    size_table: '📐 Size Table',
    section_header: '📌 Section',
    text_block: '📝 Text Block',
    consent: '✅ Consent',
}

function TemplateCard({
    template,
    onUse,
    isLoading,
}: {
    template: FormTemplate
    onUse: (id: string) => void
    isLoading: boolean
}) {
    return (
        <div className="rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/8 transition-all duration-200 overflow-hidden group">
            {/* Card header */}
            <div className="px-5 pt-5 pb-4">
                <div className="flex items-start gap-4">
                    <div className="text-4xl shrink-0 leading-none mt-0.5">{template.emoji}</div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                                {template.category}
                            </span>
                        </div>
                        <h3 className="text-base font-semibold text-white leading-snug">{template.name}</h3>
                        <p className="text-sm text-gray-400 mt-1 leading-relaxed">{template.description}</p>
                    </div>
                </div>
            </div>

            {/* Field chips */}
            <div className="px-5 pb-4">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Includes</p>
                <div className="flex flex-wrap gap-1.5">
                    {template.fields.map((f, i) => (
                        <span
                            key={i}
                            className="text-xs bg-white/5 text-gray-400 border border-white/10 px-2 py-0.5 rounded-md"
                        >
                            {FIELD_TYPE_LABELS[f.type] || f.type} — {f.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Action */}
            <div className="px-5 pb-5">
                <button
                    onClick={() => onUse(template.id)}
                    disabled={isLoading}
                    id={`use-template-${template.id}`}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating form…
                        </>
                    ) : (
                        <>
                            Use this template
                            <ChevronRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

export default function TemplatePickerButton() {
    const [isOpen, setIsOpen] = useState(false)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const router = useRouter()
    const { addToast } = useToast()

    const handleUseTemplate = async (templateId: string) => {
        if (loadingId) return
        setLoadingId(templateId)
        try {
            const result = await createFormFromTemplate(templateId, 'en')
            if (result?.error) {
                addToast(result.error, 'error')
                setLoadingId(null)
            } else if (result?.success && result?.id) {
                addToast('Form created from template!', 'success')
                setIsOpen(false)
                router.push(`/forms/${result.id}/edit`)
            }
        } catch (error) {
            addToast('Failed to create form from template. Please try again.', 'error')
            setLoadingId(null)
        }
    }

    return (
        <>
            <button
                id="open-template-picker"
                onClick={() => setIsOpen(true)}
                className="w-full sm:w-auto rounded-md bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors flex items-center justify-center gap-2 border border-white/10"
            >
                <LayoutTemplate className="h-4 w-4 shrink-0" />
                Use Template
            </button>

            <Dialog open={isOpen} onClose={() => { if (!loadingId) setIsOpen(false) }}>
                <DialogContent className="sm:max-w-2xl bg-gray-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader onClose={() => { if (!loadingId) setIsOpen(false) }}>
                        <DialogTitle className="flex items-center gap-2">
                            <LayoutTemplate className="h-5 w-5 text-primary" />
                            Choose a Template
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Start with a pre-built form. All field labels can be renamed after creation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 grid grid-cols-1 gap-4">
                        {formTemplates.map((template) => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onUse={handleUseTemplate}
                                isLoading={loadingId === template.id}
                            />
                        ))}
                    </div>

                    {formTemplates.length === 0 && (
                        <div className="py-12 text-center text-gray-500">
                            No templates available yet.
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
