'use client'

import { useState } from 'react'
import { Form, FormField } from '@/types'
import { submitResponse } from '@/actions/responses'
import { CheckCircle2, Send, Undo2, Upload, X, File, Trash2 } from 'lucide-react'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { validateFile, formatFileSize, getFileIcon, ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/fileUpload'
import { uploadFile } from '@/actions/files'
import { latinToThaana } from '@/lib/thaana'

export default function DhivehiPublicForm({ form, fields, className }: { form: Form, fields: FormField[], className?: string }) {
    const displayTitle = form.title
    const displayDesc = form.description

    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({})
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

        // Basic Validation
        let hasError = false
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        for (const field of fields) {
            // Skip non-input fields
            if (field.type === 'text_block' || field.type === 'image') continue

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

    const isFormClosed = !form.is_accepting_responses || (form.closes_at && new Date() > new Date(form.closes_at))

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
            <div className="animate-in fade-in zoom-in duration-500">
                <div className="rounded-lg bg-white/5 ring-1 ring-white/10 shadow-2xl text-center py-16 px-6" dir="rtl">
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="bg-green-500/10 p-4 rounded-full ring-1 ring-green-500/20">
                                <CheckCircle2 className="h-16 w-16 text-green-400" />
                            </div>
                        </div>
                        <div className="space-y-2 font-waheed">
                            <h2 className="text-3xl text-white">{displayTitle}</h2>
                            <p className="text-gray-400 text-lg">
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
        <form onSubmit={handleSubmit} className={`space-y-12 pb-20 px-4 md:px-0 animate-in slide-in-from-bottom-4 duration-700 ${className || ''}`} dir="rtl" noValidate>
            {/* Form Header */}
            <div className="border-b border-white/10 pb-12 text-right">
                <div>
                    <h2 className="text-2xl text-gray-400 font-waheed">
                        {displayTitle}
                    </h2>
                    {displayDesc && (
                        <p className="mt-1 text-sm/6 text-gray-400 whitespace-pre-wrap font-faruma">
                            {displayDesc}
                        </p>
                    )}
                </div>

                <p className="mt-6 text-xs text-gray-500 font-faruma">
                    <span className="text-primary">*</span> މި ފާހަގަ ޖަހާފައިވާ ބައިތައް ފުރިހަމަ ކުރަންވާނެ
                </p>
            </div>

            {/* Field Cards */}
            <div className="space-y-6">
                {fields.map((field) => {
                    // Normalize options for choice fields (handling legacy array vs new object format)
                    // For Dhivehi, prefer dv options if available
                    const options = (field.options as any) || {}

                    let label = field.type === 'english_text' ? field.label : (options.label_dv || field.label)
                    let placeholder = (field.type === 'english_text' || field.type === 'email') ? field.placeholder : (options.placeholder_dv || field.placeholder)
                    let content = options.content_dv || options.content

                    const choiceOptions: string[] = Array.isArray(field.options)
                        ? field.options // legacy
                        : (options.items_dv && options.items_dv.length > 0 ? options.items_dv : (options.items || []))

                    // Fallback if dv label missing (shouldn't happen if user used builder mostly)
                    if (!label) label = field.label

                    return (
                        <div key={field.id}>
                            {field.type !== 'text_block' && field.type !== 'image' && field.type !== 'consent' && (
                                field.type === 'english_text' ? (
                                    <label htmlFor={field.id} className="block text-sm/6 font-medium text-gray-900 text-left font-sans" dir="ltr">
                                        {label}
                                        {field.required && <span className="text-primary ml-1">*</span>}
                                    </label>
                                ) : (
                                    <label htmlFor={field.id} className="block text-2xl text-gray-400 text-right font-waheed">
                                        {label}
                                        {field.required && <span className="text-primary mr-1">*</span>}
                                    </label>
                                )
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
                                                <p className="text-lg text-gray-200 whitespace-pre-wrap font-faruma text-justify leading-relaxed">{content}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label htmlFor={field.id} className="text-xl text-white font-waheed">
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
                                {field.type === 'short_text' && (
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
                                        placeholder={placeholder || '123'}
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
                                        className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 text-left font-sans"
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
                                        className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 text-left font-sans"
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
                                                className="block w-full rounded-md bg-white/5 py-1.5 px-3 text-base text-white outline-1 -outline-offset-1 outline-white/10 *:bg-gray-800 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 text-right font-faruma"
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
                                                <div key={i} className="relative flex gap-x-3" dir="rtl">
                                                    <div className="flex h-6 items-center">
                                                        <input
                                                            id={`${field.id}-${i}`}
                                                            name={field.id}
                                                            type={field.type === 'radio' ? 'radio' : 'checkbox'}
                                                            required={field.required && !answers[field.id]}
                                                            checked={
                                                                field.type === 'radio'
                                                                    ? answers[field.id] === option
                                                                    : (answers[field.id] as string[])?.includes(option)
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
                                                            className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                    </div>
                                                    <div className="text-sm/6">
                                                        <label htmlFor={`${field.id}-${i}`} className="text-gray-900 font-faruma">
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
                                        required={field.required}
                                        value={(answers[field.id] as string) || ''}
                                        onChange={(e) => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                                        className="block w-full rounded-md bg-white/5 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm/6 text-right font-faruma [color-scheme:dark]"
                                    />
                                )}

                                {field.type === 'time' && (
                                    <input
                                        type="time"
                                        required={field.required}
                                        value={(answers[field.id] as string) || ''}
                                        onChange={(e) => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                                        className="block w-full rounded-md bg-white/5 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm/6 text-right font-faruma [color-scheme:dark]"
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
                                        <h3 className="text-2xl text-white mb-2 font-waheed">{label}</h3>
                                        {content && (
                                            <p className="text-gray-400 whitespace-pre-wrap leading-relaxed font-faruma">
                                                {content}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {field.type === 'file' && (
                                    <div className="space-y-4">
                                        {/* File Upload Area */}
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
                                                className={`flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed cursor-pointer transition-all ${uploadedFiles[field.id]
                                                    ? 'border-primary/50 bg-primary/5'
                                                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {uploadedFiles[field.id] ? (
                                                    <div className="flex items-center gap-3 px-4">
                                                        <span className="text-2xl">{getFileIcon(uploadedFiles[field.id].name)}</span>
                                                        <div className="text-right flex-1">
                                                            <p className="text-sm text-gray-900 truncate max-w-xs font-faruma">
                                                                {uploadedFiles[field.id].name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {formatFileSize(uploadedFiles[field.id].size)}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                handleFileChange(field.id, null)
                                                            }}
                                                            className="text-gray-400 hover:text-gray-500 p-1 hover:bg-gray-200 rounded transition-colors"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center font-faruma">
                                                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                                        <p className="mt-2 text-sm text-gray-600">
                                                            <span className="font-semibold">އަޕްލޯޑްކުރުމަށް ފިއްތާލާ</span> ނުވަތަ ގެނެސް ދޫކޮށްލާ
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max {MAX_FILE_SIZE / 1024 / 1024}MB)
                                                        </p>
                                                    </div>
                                                )}
                                            </label>
                                        </div>

                                        {/* Upload Progress */}
                                        {uploadingFiles[field.id] && (
                                            <div className="flex items-center gap-2 text-sm text-primary font-faruma" dir="rtl">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                <span>އަޕްލޯޑް ކުރެވެނީ...</span>
                                            </div>
                                        )}

                                        {/* File Requirements */}
                                        <p className="text-xs text-gray-500 text-right font-faruma">
                                            Allowed file types: {ALLOWED_EXTENSIONS.join(', ')} • Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
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
                    disabled={isSubmitting}
                    className="flex-1 w-full rounded-md bg-primary px-6 py-2 text-lg text-white shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center font-waheed"
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ފޮނުވެނީ...
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
                    <span className="hidden sm:inline text-lg font-waheed">ފޯމު ސާފުކުރޭ</span>
                    <Trash2 className="h-5 w-5 sm:hidden" />
                </button>

            </div>

            <div className="pt-10 text-center">

            </div>
            {dialog}
        </form>
    )
}
