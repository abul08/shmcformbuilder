'use client'

import { useState } from 'react'
import { Form, FormField } from '@/types'
import { submitResponse } from '@/actions/responses'
import { CheckCircle2, Send, Undo2, Upload, File, Trash2, Calendar, Copy, Eye, Plus, AlertCircle, Link as LinkIcon, Info as InfoIcon, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { validateFile, formatFileSize, ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/fileUpload'
import { uploadFile } from '@/actions/files'
import { latinToThaana } from '@/lib/thaana'
import PublicLogoHeader from '@/components/PublicLogoHeader'

export default function DhivehiPublicForm({ form, fields, className, isPreview = false }: { form: Form, fields: FormField[], className?: string, isPreview?: boolean }) {
    const displayTitle = form.title
    const displayDesc = form.description

    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({})
    const [openModalId, setOpenModalId] = useState<string | null>(null)
    const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { confirm, dialog } = useConfirmDialog()
    const { addToast } = useToast()

    const handleFileChange = (fieldId: string, file: File | null) => {
        if (!file) {
            const newFiles = { ...uploadedFiles }
            delete newFiles[fieldId]
            setUploadedFiles(newFiles)
            const newAnswers = { ...answers }
            delete newAnswers[fieldId]
            setAnswers(newAnswers)
            return
        }

        const validation = validateFile(file)
        if (!validation.valid) {
            addToast(validation.error || 'Invalid file', 'error', 'font-waheed')
            return
        }

        setUploadedFiles({ ...uploadedFiles, [fieldId]: file })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (isPreview) {
            addToast('Preview mode: responses are not submitted.', 'info', 'font-waheed')
            return
        }

        // Basic Validation
        let hasError = false
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        for (const field of fields) {
            // Skip non-input fields
            if (field.type === 'text_block' || field.type === 'image' || field.type === 'section_header' || field.type === 'bank_account' || field.type === 'redirect_link' || field.type === 'info_modal') continue

            const answer = answers[field.id]
            const file = uploadedFiles[field.id]
            const options = (field.options as any) || {}
            // Use label_dv for error messages if available, else label (for english fields)
            const label = field.type === 'english_text' ? field.label : (options.label_dv || field.label)

            // Check Required
            if (field.required) {
                if (field.type === 'file') {
                    if (!file) {
                        addToast(`${label} - ފައިލް އަޕްލޯޑްކުރައްވާ`, 'error', 'font-waheed') // Please upload file
                        hasError = true
                    }
                } else if (field.type === 'consent') {
                    if (!answer) {
                        addToast(`${label} - ޤަބޫލުކުރައްވާ`, 'error', 'font-waheed') // Please accept
                        hasError = true
                    }
                } else if (field.type === 'text_list') {
                    const minItems = (field.options as any)?.min_items || 1;
                    const validItemsCount = Array.isArray(answer) ? answer.filter(val => val.trim() !== '').length : 0;
                    if (validItemsCount < minItems) {
                        addToast(`${label} - މަދުވެގެން ${minItems} ޖަވާބު ދެއްވާ`, 'error', 'font-waheed')
                        hasError = true
                    }
                } else if (field.type === 'block_list') {
                    const minBlocks = (field.options as any)?.min_blocks || 1;
                    const subFields = (field.options as any)?.sub_fields || [];

                    const validBlocks = Array.isArray(answer) ? answer.filter(block => {
                        return subFields.every((sf: any) => block && typeof block === 'object' && block[sf.id] && block[sf.id].trim() !== '');
                    }) : [];

                    if (validBlocks.length < minBlocks) {
                        addToast(`${label} - މަދުވެގެން ${minBlocks} ބްލޮކް ފުރިހަމަކުރައްވާ`, 'error', 'font-waheed')
                        hasError = true
                    }
                } else {
                    if (!answer || (typeof answer === 'string' && !answer.trim())) {
                        addToast(`${label} - ހުސްކޮށް ނުބެހެއްޓޭނެ`, 'error', 'font-waheed') // Cannot be empty
                        hasError = true
                    }
                }
            }

            // Check Email Format
            if (answer && field.type === 'email' && typeof answer === 'string') {
                if (!emailRegex.test(answer)) {
                    addToast(`${label} - އީމެއިލް ރަނގަޅެއް ނޫން`, 'error', 'font-waheed') // Invalid Email
                    hasError = true
                }
            }
        }

        if (hasError) {
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            // First, create the response to get response ID
            const metadata = {
                user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
                language_mode: 'dv'
            }

            // Upload files first and get their URLs
            const fileAnswers: Record<string, any> = {}
            const fileFields = fields.filter(f => f.type === 'file')

            for (const field of fileFields) {
                const file = uploadedFiles[field.id]
                if (file) {
                    setUploadingFiles(prev => ({ ...prev, [field.id]: true }))

                    const formData = new FormData()
                    formData.append('file', file)

                    // For now, upload to a temporary location. In submitResponse, we'll move it to the proper location
                    const uploadResult = await uploadFile(formData, form.id, `responses/temp-${Date.now()}`)

                    setUploadingFiles(prev => ({ ...prev, [field.id]: false }))

                    if (uploadResult.error) {
                        throw new Error(`Failed to upload ${file.name}: ${uploadResult.error}`)
                    }

                    fileAnswers[field.id] = {
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        filePath: uploadResult.path,
                        fileUrl: uploadResult.url,
                    }
                }
            }

            // Merge file answers with other answers
            const allAnswers = { ...answers, ...fileAnswers }

            const result = await submitResponse(form.id, allAnswers, metadata)

            if (result.error) {
                setError(result.error)
                addToast(result.error, 'error', 'font-waheed')
            } else {
                setIsSubmitted(true)
                setUploadedFiles({})
                addToast('ފޯމު ކާމިޔާބުކަމާއެކު ހުށަހެޅިއްޖެ!', 'success', 'font-waheed')
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to submit response'
            setError(message)
            addToast(message, 'error', 'font-waheed')
        } finally {
            setIsSubmitting(false)
            setUploadingFiles({})
        }
    }

    const isFormClosed = !isPreview && (!form.is_accepting_responses || (form.closes_at && new Date() > new Date(form.closes_at)))

    if (isFormClosed) {
        return (
            <div className={`mx-auto max-w-3xl px-4 py-12 ${className || ''}`} dir="rtl">
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 mb-4">
                        <X className="h-6 w-6 text-red-400" />
                    </div>
                    <h2 className="text-xl text-white mb-2 font-waheed">ޖަވާބު ބަލައިގަތުން ހުއްޓާލެވިފައި</h2>
                    <p className="text-gray-400 font-faruma">
                        މި ފޯމަށް ޖަވާބު ބަލައިގަތުން ވަނީ ހުއްޓާލެވިފައި
                    </p>
                </div>
            </div>
        )
    }

    if (isSubmitted) {
        return (
            <div className="animate-in fade-in zoom-in duration-500 pr-2 pl-2">
                <div className="rounded-lg bg-white/5 ring-1 ring-white/10 shadow-2xl text-center py-16 px-6" dir="rtl">
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="bg-green-500/10 p-4 rounded-full ring-1 ring-green-500/20">
                                <CheckCircle2 className="h-16 w-16 text-green-400" />
                            </div>
                        </div>
                        <div className="space-y-2 font-waheed">
                            <h2 className="text-2xl text-gray-300">{displayTitle}</h2>
                            <p className="text-gray-600 text-lg">
                                ފޯމު ކާމިޔާބުކަމާއެކު ހުށަހެޅިއްޖެ!
                            </p>
                        </div>
                        <div className="pt-4">
                            <button
                                onClick={() => {
                                    setAnswers({})
                                    setUploadedFiles({})
                                    setIsSubmitted(false)
                                }}
                                className="rounded-md bg-white/10 px-6 py-2.5 text-sm text-white hover:bg-white/20 transition-colors font-faruma"
                            >
                                <Undo2 className="h-4 w-4 inline -mt-0.5 ml-2 rotate-180" />
                                އެހެން ރިސްޕޮންސްއެއް ހުށަހަޅާ
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className={`space-y-12 pb-20 px-2 md:px-0 animate-in slide-in-from-bottom-4 duration-700 ${className || ''}`} dir="rtl" noValidate>

            {/* Header with Logo */}
            <PublicLogoHeader />

            {isPreview && (
                <div className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary-100 font-faruma">
                    ޕްރިވިއުވް މޯޑް. މި ފޯމް އަދި ޕަބްލިކް ނޫން. މި ރެސްޕޮންސްތައް ސޭވް ނުކުރެވޭ.
                </div>
            )}

            {/* Form Header */}
            <div className="border-b border-white/10 pb-12 text-right">
                <div>
                    {(form.settings as any)?.form_type && (
                        <p className="text-lg text-primary mb-2 px-4 font-waheed tracking-wider opacity-80">
                            {(form.settings as any).form_type}
                        </p>
                    )}
                    {(form.settings as any)?.form_number && (
                        <p className="text-sm sm:text-lg text-gray-400 mb-6 font-waheed opacity-70 px-4 pr-1" dir="ltr">
                            {(form.settings as any).form_number} <span className="font-waheed sm:text-2xl text-lg px-4" dir="rtl">ނަންބަރު:</span>
                        </p>
                    )}
                    <h2 className="text-2xl sm:text-3xl text-gray-400 font-aammu tracking-wide px-4 mt-2">
                        {displayTitle}
                    </h2>
                    {displayDesc && (
                        <p className="mt-1 text-sm/6 text-gray-400 whitespace-pre-wrap px-4 font-faruma">
                            {displayDesc}
                        </p>
                    )}
                </div>

                <p className="mt-6 text-md text-gray-600 px-4 font-faruma">
                    <span className="text-primary">*</span> މި ފާހަގަ ޖަހާފައިވާ ބައިތައް ފުރިހަމަ ކުރަންވާނެ
                </p>
            </div>

            {/* Field Cards */}
            <div className="space-y-8">
                {(() => {
                    const sections: import('@/types').FormField[][] = [];
                    let currentSection: import('@/types').FormField[] = [];

                    fields.forEach(field => {
                        if (field.type === 'section_header') {
                            if (currentSection.length > 0) sections.push(currentSection);
                            currentSection = [field];
                        } else {
                            currentSection.push(field);
                        }
                    });
                    if (currentSection.length > 0) sections.push(currentSection);

                    return sections.map((sectionFields, sIdx) => {
                        const isSection = sectionFields[0]?.type === 'section_header';
                        return (
                            <div key={`section-${sIdx}`} className={isSection ? 'rounded-xl border border-white/10 bg-black/10 px-4 py-6 md:px-6 md:py-8 shadow-sm space-y-8' : 'space-y-8'}>
                                {sectionFields.map((field) => {
                                    // Normalize options for choice fields (handling legacy array vs new object format)
                                    // For Dhivehi, prefer dv options if available
                                    const options = (field.options as any) || {}



                                    let label = field.type === 'english_text' ? field.label : (options.label_dv || field.label)
                                    let placeholder = (field.type === 'english_text' || field.type === 'email') ? field.placeholder : (options.placeholder_dv || field.placeholder)
                                    let content = options.content_dv || options.content

                                    const choiceOptions: string[] = Array.isArray(field.options)
                                        ? field.options // legacy
                                        : (options.items_dv && options.items_dv.length > 0 ? options.items_dv : (options.items || []))

                                    if (!label) label = field.label

                                    return (
                                        <div key={field.id} id={`field-${field.id}`} className="scroll-mt-24">
                                            {/* Question Label */}
                                            {field.type !== 'text_block' && field.type !== 'image' && field.type !== 'consent' && field.type !== 'section_header' && field.type !== 'bank_account' && (
                                                <label htmlFor={field.id} className="block sm:text-2xl text-xl text-gray-400 text-right font-waheed" dir="rtl">
                                                    {label}
                                                    {field.required && <span className="text-primary mr-1">*</span>}
                                                </label>
                                            )}
                                            <div className="mt-2">
                                                {field.type === 'consent' && (
                                                    <div className="space-y-4 bg-white/5 p-4 rounded-lg border border-white/10" dir="rtl">
                                                        <div>
                                                            <h3 className="text-2xl text-gray-400 font-waheed mb-3">
                                                                {label}
                                                                {field.required && <span className="text-primary mr-1">*</span>}
                                                            </h3>
                                                            {content && (
                                                                <p className="text-lg text-gray-400 whitespace-pre-wrap font-faruma text-justify leading-relaxed pr-4">{content}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 pr-4">
                                                            <label htmlFor={field.id} className="text-xl text-gray-400 font-waheed">
                                                                ޤަބޫލް
                                                            </label>
                                                            <div className="flex h-6 items-center">
                                                                <input
                                                                    id={field.id}
                                                                    type="checkbox"
                                                                    required={field.required}
                                                                    checked={!!answers[field.id]}
                                                                    onChange={(e) => setAnswers(prev => ({ ...prev, [field.id]: e.target.checked }))}
                                                                    className="size-5 rounded border-white/30 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {field.type === 'short_text' && !(field.options as any)?.is_english_answer && (
                                                    <input
                                                        id={field.id}
                                                        type="text"
                                                        required={field.required}
                                                        value={(answers[field.id] as string) || ''}
                                                        placeholder={placeholder || 'ޖަވާބު...'}
                                                        onChange={(e) => {
                                                            let val = e.target.value
                                                            // Always transliterate for Dhivehi form
                                                            val = latinToThaana(val)
                                                            setAnswers(prev => ({ ...prev, [field.id]: val }))
                                                        }}
                                                        className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 text-right font-faruma"
                                                        dir="rtl"
                                                    />
                                                )}
                                                {field.type === 'number' && (
                                                    <input
                                                        id={field.id}
                                                        type="number"
                                                        required={field.required}
                                                        value={(answers[field.id] as string) || ''}
                                                        placeholder={placeholder || ''}
                                                        onChange={(e) => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                        className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 text-right font-inter"
                                                        dir="ltr"
                                                    />
                                                )}

                                                {field.type === 'english_text' && (
                                                    <input
                                                        id={field.id}
                                                        type="text"
                                                        required={field.required}
                                                        value={(answers[field.id] as string) || ''}
                                                        placeholder={placeholder || 'Answer...'}
                                                        onChange={(e) => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                        className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 text-right font-sans"
                                                        dir="ltr"
                                                    />
                                                )}

                                                {(field.type === 'short_text' && (field.options as any)?.is_english_answer) && (
                                                    <input
                                                        id={field.id}
                                                        type="text"
                                                        required={field.required}
                                                        value={(answers[field.id] as string) || ''}
                                                        placeholder={placeholder || 'Answer...'}
                                                        onChange={(e) => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                        className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 text-right font-sans"
                                                        dir="ltr"
                                                    />
                                                )}
                                                {field.type === 'email' && (
                                                    <input
                                                        id={field.id}
                                                        type="email"
                                                        required={field.required}
                                                        value={(answers[field.id] as string) || ''}
                                                        placeholder={placeholder || 'email@example.com'}
                                                        onChange={(e) => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                        className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 text-right font-sans"
                                                        dir="ltr"
                                                    />
                                                )}

                                                {field.type === 'long_text' && (
                                                    <textarea
                                                        id={field.id}
                                                        rows={4}
                                                        required={field.required}
                                                        value={(answers[field.id] as string) || ''}
                                                        placeholder={placeholder || 'ތަފްސީލު...'}
                                                        onChange={(e) => {
                                                            let val = e.target.value
                                                            // Always transliterate for Dhivehi form
                                                            val = latinToThaana(val)
                                                            setAnswers(prev => ({ ...prev, [field.id]: val }))
                                                        }}
                                                        className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 text-right font-faruma"
                                                        dir="rtl"
                                                    ></textarea>
                                                )}

                                                {/* Choice Fields */}
                                                {(field.type === 'radio' || field.type === 'checkbox' || field.type === 'dropdown') && (
                                                    <div className="space-y-3">
                                                        {field.type === 'dropdown' ? (
                                                            <select
                                                                id={field.id}
                                                                required={field.required}
                                                                value={field.type === 'dropdown' ? (answers[field.id] as string) || '' : undefined}
                                                                onChange={(e) => {
                                                                    const val = e.target.value
                                                                    setAnswers(prev => ({ ...prev, [field.id]: val }))
                                                                }}
                                                                className="block w-full rounded-md bg-white/5 py-1.5 px-3 text-base text-gray-400 outline-1 -outline-offset-1 outline-white/10 *:bg-gray-800 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 text-right font-faruma"
                                                                dir="rtl"
                                                            >
                                                                <option value="">ހިޔާރުކުރައްވާ</option>
                                                                {choiceOptions.map((option, i) => (
                                                                    <option key={i} value={option}>
                                                                        {option}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            choiceOptions.map((option, i) => (
                                                                <div key={i} className="relative flex gap-x-3 pr-4" dir="rtl">
                                                                    <div className="flex h-6 items-center">
                                                                        <input
                                                                            id={`${field.id}-${i}`}
                                                                            name={field.id}
                                                                            type={field.type === 'radio' ? 'radio' : 'checkbox'}
                                                                            required={field.required && !answers[field.id]}
                                                                            checked={
                                                                                field.type === 'radio'
                                                                                    ? answers[field.id] === option
                                                                                    : (answers[field.id] as string[])?.includes(option) ?? false
                                                                            }
                                                                            onChange={(e) => {
                                                                                if (field.type === 'radio') {
                                                                                    setAnswers(prev => ({ ...prev, [field.id]: option }))
                                                                                } else {
                                                                                    const current = (answers[field.id] as string[]) || []
                                                                                    if (e.target.checked) {
                                                                                        setAnswers(prev => ({ ...prev, [field.id]: [...current, option] }))
                                                                                    } else {
                                                                                        setAnswers(prev => ({ ...prev, [field.id]: current.filter(o => o !== option) }))
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="h-4 w-4 border-gray-400 text-primary focus:ring-primary"
                                                                        />
                                                                    </div>
                                                                    <div className="text-sm/6">
                                                                        <label htmlFor={`${field.id}-${i}`} className="text-gray-400 font-faruma">
                                                                            {option}
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}

                                                {field.type === 'date' && (
                                                    <input
                                                        type="date"
                                                        dir="ltr"
                                                        required={field.required}
                                                        value={(answers[field.id] as string) || ''}
                                                        onChange={(e) => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                        className="block w-full rounded-md bg-white/5 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm/6 text-right font-inter"
                                                    />
                                                )}

                                                {field.type === 'time' && (
                                                    <input
                                                        type="time"
                                                        dir="ltr"
                                                        required={field.required}
                                                        value={(answers[field.id] as string) || ''}
                                                        onChange={(e) => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                        className="block w-full rounded-md bg-white/5 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm/6 text-right font-inter"
                                                    />
                                                )}

                                                {field.type === 'image' && (
                                                    <div className="flex justify-center my-4">
                                                        {(field.options as any)?.imageUrl ? (
                                                            <img
                                                                src={(field.options as any).imageUrl}
                                                                alt={(field.options as any)?.altText || field.label}
                                                                className="max-w-full h-auto rounded-lg border border-white/10 shadow-lg"
                                                            />
                                                        ) : (
                                                            <div className="w-full p-8 text-center text-gray-500 bg-white/5 rounded-lg border border-dashed border-white/10 font-faruma">
                                                                ފޮޓޯއެއް ނެތް
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {field.type === 'text_block' && (
                                                    <div className="my-6 border-r-2 border-primary/20 pr-4 py-2 text-right">
                                                        <h3 className="text-2xl text-gray-400 mb-2 font-waheed">{label}</h3>
                                                        {content && (
                                                            <p className="text-gray-500 whitespace-pre-wrap leading-relaxed font-faruma">
                                                                {content}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {field.type === 'block_list' && (() => {
                                                    const subFields: { id: string, label: string, label_dv?: string, type?: string }[] = (field.options as any)?.sub_fields || [{ id: 'sf_1', label: 'Field 1', label_dv: 'ފީލްޑް 1', type: 'text' }];
                                                    const blocks = Array.isArray(answers[field.id]) && answers[field.id].length > 0 ? answers[field.id] : [{}];

                                                    return (
                                                        <div className="space-y-6 mt-4" dir="rtl">
                                                            {blocks.map((block: any, idx: number) => (
                                                                <div key={idx} className="relative rounded-lg border border-white/10 bg-black/20 p-5">
                                                                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                                                                        <h4 className="text-xl text-primary font-waheed">
                                                                            {label} {idx + 1}
                                                                        </h4>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const current = [...blocks];
                                                                                if (current.length === 1) {
                                                                                    current[0] = {};
                                                                                } else {
                                                                                    current.splice(idx, 1);
                                                                                }
                                                                                setAnswers(prev => ({ ...prev, [field.id]: current }));
                                                                            }}
                                                                            className="text-gray-500 hover:text-red-400"
                                                                        >
                                                                            <X className="h-5 w-5" />
                                                                        </button>
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        {subFields.map(sf => (
                                                                            <div key={sf.id}>
                                                                                <label className="block text-lg text-gray-400 mb-1 text-right font-waheed">
                                                                                    {sf.label_dv || sf.label}
                                                                                    {field.required && <span className="text-primary mr-1">*</span>}
                                                                                </label>
                                                                                <input
                                                                                    type={sf.type || 'text'}
                                                                                    value={block[sf.id] || ''}
                                                                                    onChange={(e) => {
                                                                                        const current = [...blocks];
                                                                                        const val = e.target.value;
                                                                                        current[idx] = { ...current[idx], [sf.id]: (sf.type === 'email' || sf.type === 'number') ? val : latinToThaana(val) };
                                                                                        setAnswers(prev => ({ ...prev, [field.id]: current }));
                                                                                    }}
                                                                                    className={`block w-full rounded-md bg-white/5 px-3 py-2 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 ${sf.type === 'email' || sf.type === 'number' ? 'text-right font-sans' : 'text-right font-faruma'}`}
                                                                                    dir={sf.type === 'email' || sf.type === 'number' ? 'ltr' : 'rtl'}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = [...blocks, {}];
                                                                    setAnswers(prev => ({ ...prev, [field.id]: current }));
                                                                }}
                                                                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-white/20 p-3 text-lg font-waheed text-gray-400 hover:border-primary hover:text-primary transition-colors bg-white/5"
                                                            >
                                                                <Plus className="h-5 w-5 ml-2" />
                                                                އިތުރު {label}
                                                            </button>
                                                        </div>
                                                    );
                                                })()}

                                                {field.type === 'text_list' && (
                                                    <div className="space-y-3" dir="rtl">
                                                        {(field.options as any)?.description_dv && (
                                                            <p className="text-sm text-gray-400 mb-2 font-faruma text-right">{(field.options as any).description_dv}</p>
                                                        )}
                                                        {((answers[field.id] as string[]) || ['']).map((val, idx) => (
                                                            <div key={idx} className="flex gap-3 items-center">
                                                                <span className="text-gray-500 font-medium w-5 text-right shrink-0">{idx + 1}.</span>
                                                                <input
                                                                    type="text"
                                                                    value={val}
                                                                    required={field.required && idx === 0 && !val}
                                                                    placeholder={(field.options as any)?.placeholder_dv || field.placeholder || 'ލިޔުއްވާ...'}
                                                                    onChange={(e) => {
                                                                        const current = [...((answers[field.id] as string[]) || [''])]
                                                                        current[idx] = latinToThaana(e.target.value)
                                                                        setAnswers(prev => ({ ...prev, [field.id]: current }))
                                                                    }}
                                                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 text-right font-faruma"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = [...((answers[field.id] as string[]) || [''])]
                                                                        if (current.length === 1) {
                                                                            current[0] = ''
                                                                        } else {
                                                                            current.splice(idx, 1)
                                                                        }
                                                                        setAnswers(prev => ({ ...prev, [field.id]: current }))
                                                                    }}
                                                                    className="text-gray-500 hover:text-red-400"
                                                                >
                                                                    <X className="h-5 w-5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const current = [...((answers[field.id] as string[]) || [''])]
                                                                current.push('')
                                                                setAnswers(prev => ({ ...prev, [field.id]: current }))
                                                            }}
                                                            className="text-sm text-primary hover:text-primary/80 font-waheed"
                                                        >
                                                            + އިތުރު ކުރައްވާ
                                                        </button>
                                                    </div>
                                                )}

                                                {field.type === 'file' && (
                                                    <div className="space-y-4" dir="rtl">
                                                        {(field.options as any)?.description_dv && (
                                                            <p className="text-sm text-gray-400 mb-2 font-faruma text-right">{(field.options as any).description_dv}</p>
                                                        )}
                                                        <div className="relative">
                                                            <input
                                                                id={field.id}
                                                                type="file"
                                                                required={field.required && !uploadedFiles[field.id]}
                                                                accept={ALLOWED_EXTENSIONS.join(',')}
                                                                onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
                                                                className="sr-only"
                                                            />
                                                            <label
                                                                htmlFor={field.id}
                                                                onDragOver={(e) => e.preventDefault()}
                                                                onDrop={(e) => {
                                                                    e.preventDefault()
                                                                    handleFileChange(field.id, e.dataTransfer.files?.[0] || null)
                                                                }}
                                                                className={`group flex min-h-44 w-full cursor-pointer flex-col justify-center rounded-xl border-2 border-dashed p-5 transition-all ${uploadedFiles[field.id]
                                                                    ? 'border-primary/60 bg-primary/10 shadow-sm shadow-primary/10'
                                                                    : 'border-gray-800 hover:border-primary/50 hover:bg-primary/5'
                                                                    }`}
                                                            >
                                                                {uploadedFiles[field.id] ? (
                                                                    <div className="flex w-full items-center gap-4">
                                                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                                                                            <File className="h-7 w-7" />
                                                                        </div>
                                                                        <div className="min-w-0 flex-1 text-right">
                                                                            <p className="truncate text-sm font-semibold text-gray-500 font-poppins">
                                                                                {uploadedFiles[field.id].name}
                                                                            </p>
                                                                            <p className="mt-1 text-xs text-gray-500">
                                                                                {formatFileSize(uploadedFiles[field.id].size)} selected
                                                                            </p>
                                                                            <p className="mt-2 text-md text-primary font-waheed">
                                                                                ފައިލް ބަދަލުކުރުމަށް މިތަނަށް ފިތާލާ
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.preventDefault()
                                                                                handleFileChange(field.id, null)
                                                                            }}
                                                                            className="rounded-full border border-gray-200 bg-white p-2 text-gray-400 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                                                            aria-label="Remove selected file"
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center font-faruma">
                                                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
                                                                            <Upload className="h-7 w-7" />
                                                                        </div>
                                                                        <p className="mt-4 text-lg font-waheed text-primary">
                                                                            ފައިލް އަޕްލޯޑް ކުރައްވާ
                                                                        </p>
                                                                        <p className="mt-1 text-sm text-gray-600">
                                                                            މިތަނަށް ޑްރެގް ކުރައްވާ، ނުވަތަ ބްރައުޒް ކުރައްވާ
                                                                        </p>

                                                                    </div>
                                                                )}
                                                            </label>
                                                        </div>

                                                        {uploadingFiles[field.id] && (
                                                            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary font-faruma">
                                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary"></div>
                                                                <span>ފައިލް އަޕްލޯޑް ވަނީ...</span>
                                                            </div>
                                                        )}

                                                    </div>
                                                )}
                                                {field.type === 'section_header' && (
                                                    <div className="mb-4 border-b border-white/10 pb-6 text-right">
                                                        <h3 className="text-2xl sm:text-3xl text-primary/65  font-waheed">{label}</h3>
                                                        {content && (
                                                            <p className="mt-1 text-base text-gray-400 whitespace-pre-wrap font-faruma leading-relaxed">
                                                                {content}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {field.type === 'bank_account' && (
                                                    <div className="rounded-lg bg-black/20 border border-white/10 p-5 mt-6 mb-4" dir="rtl">
                                                        <h3 className="text-xl font-waheed text-white mb-4 text-right">{label || 'ބޭންކް އެކައުންޓް'}</h3>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center bg-white/5 rounded-md px-4 py-3">
                                                                <span className="text-sm text-gray-400 font-faruma">އެކައުންޓްގެ ނަން</span>
                                                                <span className="text-sm font-semibold text-gray-200 font-faruma">{(field.options as any)?.accountName || '-'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-white/5 rounded-md px-4 py-3">
                                                                <span className="text-sm text-gray-400 font-faruma">އެކައުންޓް ނަންބަރު</span>
                                                                <div className="flex items-center gap-3" dir="ltr">
                                                                    <span className="text-lg font-mono font-bold text-primary">{(field.options as any)?.accountNumber || '-'}</span>
                                                                    {(field.options as any)?.accountNumber && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText((field.options as any).accountNumber)
                                                                                addToast('އެކައުންޓް ނަންބަރު ކޮޕީ ކުރެވިއްޖެ', 'success', 'font-waheed')
                                                                            }}
                                                                            className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-md transition-colors"
                                                                            title="ކޮޕީ ކުރޭ"
                                                                        >
                                                                            <Copy className="h-4 w-4" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Redirect Link */}
                                                {field.type === 'redirect_link' && (
                                                    <div className="flex justify-start my-4">
                                                        <a
                                                            href={(field.options as any)?.url || '#'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="group inline-flex items-center gap-2 rounded-full bg-white/5 px-6 py-2.5 text-base font-waheed text-gray-200 hover:bg-white/10 hover:text-white transition-all border border-white/5 hover:border-white/10"
                                                        >
                                                            {label || 'ލިންކަށް ދިއުމަށް'}
                                                            <LinkIcon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Info Modal */}
                                                {field.type === 'info_modal' && (
                                                    <div className="flex justify-start my-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenModalId(field.id)}
                                                            className="group inline-flex items-center gap-2 rounded-full bg-white/5 px-6 py-2.5 text-base font-waheed text-gray-200 hover:bg-white/10 hover:text-white transition-all border border-white/5 hover:border-white/10"
                                                        >
                                                            {label || 'އިތުރު މަޢުލޫމާތު'}
                                                            <InfoIcon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                                                        </button>
                                                        
                                                        {/* Modal Dialog for Info */}
                                                        {openModalId === field.id && (
                                                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
                                                                <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-gray-900 border border-white/10 rounded-xl shadow-2xl">
                                                                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                                                                        <h3 className="text-xl font-waheed text-white">
                                                                            {(field.options as any)?.modal_title_dv || label}
                                                                        </h3>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => setOpenModalId(null)}
                                                                            className="text-gray-400 hover:text-white transition-colors p-1"
                                                                        >
                                                                            <X className="h-5 w-5" />
                                                                        </button>
                                                                    </div>
                                                                    <div className="p-6 overflow-y-auto">
                                                                        <div className="text-gray-300 text-sm md:text-base leading-relaxed font-faruma text-right prose prose-invert max-w-none prose-sm ![&_p]:my-1 ![&_ul]:my-1 ![&_li]:my-0 ![&_h1]:mb-1 ![&_h2]:mb-1 ![&_h3]:mb-1 ![&_h1]:mt-3 ![&_h2]:mt-3 ![&_h3]:mt-2">
                                                                            <ReactMarkdown>
                                                                                {((field.options as any)?.modal_content_dv as string) || 'މަޢުލޫމާތެއް ނެތް.'}
                                                                            </ReactMarkdown>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-start px-6 py-4 border-t border-white/10 bg-black/20 rounded-b-xl">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setOpenModalId(null)}
                                                                            className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors font-waheed"
                                                                        >
                                                                            ބަންދުކުރައްވާ
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })
                })()}
            </div>

            {
                error && (
                    <div className="rounded-md bg-red-500/10 px-4 py-3 ring-1 ring-inset ring-red-500/20">
                        <p className="text-sm text-red-400 text-center font-faruma">{error}</p>
                    </div>
                )
            }


            <div className="flex items-center gap-4 pt-6" dir="rtl">
                <button
                    type="submit"
                    disabled={isSubmitting || isPreview}
                    className="flex-1 w-full rounded-md bg-primary px-6 py-2 text-lg text-white shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center font-waheed"
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ފޮނުވެނީ...
                        </span>
                    ) : isPreview ? (
                        <span className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Preview only
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            ފޮނުވާ
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={async () => {
                        // In English we invoke confirm(), assume it supports RTL or just use English there for now as confirm dialog might be global.
                        const confirmed = await confirm({
                            title: 'ޖަވާބުތައް ފުހެލަންވީ؟',
                            description: 'މިހާތަނަށް ލިޔުނު ހުރިހާ ޖަވާބުތަކެއް ފުހެވޭނެއެވެ.',
                            confirmText: 'ފުހެލާ',
                            cancelText: 'ކެންސަލް',
                            variant: 'warning'
                        })
                        if (confirmed) {
                            setAnswers({})
                            setUploadedFiles({})
                            addToast('ފޯމު ސާފުކުރެވިއްޖެ', 'info', 'font-waheed')
                        }
                    }}
                    className="p-2 sm:p-0 text-gray-400 hover:text-white transition-colors shrink-0"
                    title="Clear form"
                >
                    <span className="hidden sm:inline text-lg font-waheed text-gray-600">ފޯމު ސާފުކުރޭ</span>
                    <Trash2 className="h-5 w-5 sm:hidden" />
                </button>

            </div>

            <div className="pt-10 text-center">

            </div>
            {dialog}
        </form>
    )
}
