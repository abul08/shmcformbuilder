'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Form, FormField, FormFieldType, Json } from '@/types'
import { Button } from '@/components/ui/button'
import { Plus, GripVertical, Trash2, CheckCircle2, Eye, Save, Globe, Settings, Loader2, ChevronLeft, X, Image as ImageIcon, Upload, Share2, Copy, Calendar } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import FormToolbox from './FormToolbox'
import Link from 'next/link'
import { addField, deleteField, updateField, reorderFields, updateFormDetails } from '@/actions/fields'
import { uploadFile } from '@/actions/files'
import { validateFile } from '@/lib/fileUpload'
import { safeGetSettings } from '@/lib/formUtils'
import { latinToThaana } from '@/lib/thaana'
import { togglePublish, updateFormSettings } from '@/actions/forms'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDebouncedCallback } from 'use-debounce'

interface SortableFieldProps {
    field: FormField
    onUpdate: (id: string, updates: Partial<FormField>) => void
    onDelete: (id: string) => void
}

function SortableField({ field, onUpdate, onDelete }: SortableFieldProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: field.id })

    const [isUploading, setIsUploading] = useState(false)
    const { addToast } = useToast()

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 0,
        opacity: isDragging ? 0.6 : 1,
    }

    const [isFocused, setIsFocused] = useState(false)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const validation = validateFile(file)
        if (!validation.valid) {
            addToast(validation.error || 'Invalid file', 'error')
            return
        }

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            // Use dedicated bucket for form assets
            const result = await uploadFile(formData, field.form_id, 'images', 'form-assets')

            if (result.error) {
                throw new Error(result.error)
            }

            onUpdate(field.id, {
                options: {
                    ...(field.options as any || {}),
                    imageUrl: result.url
                }
            })
            addToast('Image uploaded successfully', 'success')
        } catch (error) {
            addToast('Failed to upload image', 'error')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="mb-8 group"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
        >
            <div className={`rounded-lg bg-white/5 ring-1 ring-inset transition-all duration-200 ${isFocused || isDragging ? 'ring-primary/50 shadow-lg shadow-primary/10' : 'ring-white/10 hover:ring-white/20'}`}>
                {/* Drag Handle & Type Badge */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10" dir="rtl">
                    <div className="flex items-center gap-3">
                        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-400 hover:text-white transition-colors touch-none">
                            <GripVertical className="h-5 w-5" />
                        </div>
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-faruma">
                            {field.type === 'short_text' && 'ކުރު ޖަވާބު'}
                            {field.type === 'long_text' && 'ދިގު ޖަވާބު'}
                            {field.type === 'email' && 'އީމެއިލް'}
                            {field.type === 'number' && 'އަދަދު'}
                            {field.type === 'date' && 'ތާރީޚް'}
                            {field.type === 'checkbox' && 'ޗެކްބޮކްސް'}
                            {field.type === 'radio' && 'މަލްޓިޕަލް ޗޮއިސް'}
                            {field.type === 'dropdown' && 'ޑްރޮޕްޑައުން'}
                            {field.type === 'file' && 'ފައިލް އަޕްލޯޑް'}
                            {field.type === 'image' && 'ފޮޓޯ'}
                            {field.type === 'text_block' && 'ލިޔުންކޮޅެއް'}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(field.id)}
                        className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6" dir="rtl">
                        {/* Label Editor */}
                        <div className="sm:col-span-4">
                            <label htmlFor={`label-${field.id}`} className="block text-lg tracking-wide text-gray-300 font-waheed">
                                {field.type === 'image' ? 'ސުރުޚީ' : field.type === 'text_block' ? 'ސުރުޚީ' : field.type === 'consent' ? 'ސުރުޚީ' : 'ސުވާލު'}
                            </label>
                            <div className="mt-2">
                                <input
                                    type="text"
                                    value={field.type === 'english_text' ? field.label : (field.options as any)?.label_dv || ''}
                                    onChange={(e) => {
                                        if (field.type === 'english_text') {
                                            onUpdate(field.id, { label: e.target.value })
                                        } else {
                                            onUpdate(field.id, {
                                                options: { ...(field.options as any || {}), label_dv: latinToThaana(e.target.value) }
                                            })
                                        }
                                    }}
                                    placeholder={field.type === 'image' ? 'ފޮޓޯގެ ނަން' : field.type === 'text_block' ? 'ސުރުޚީ...' : field.type === 'consent' ? 'އިޤްރާރުގެ ސުރުޚީ...' : field.type === 'english_text' ? 'English Question...' : "ސުވާލު (ދިވެހި)..."}
                                    className={`block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 ${field.type === 'english_text' ? 'text-left font-sans' : 'text-right font-faruma'}`}
                                    dir={field.type === 'english_text' ? 'ltr' : 'rtl'}
                                />
                            </div>
                        </div>

                        {/* Field Type Selector */}
                        <div className="sm:col-span-2">
                            <label htmlFor={`type-${field.id}`} className="block text-sm/6 text-white text-right font-faruma">
                                ބާވަތް
                            </label>
                            <div className="mt-2">
                                <select
                                    id={`type-${field.id}`}
                                    value={field.type}
                                    onChange={(e) => {
                                        const newType = e.target.value as FormFieldType
                                        const updates: any = { type: newType }
                                        // Clear Dhivehi label if switching to English text to prevent it from shadowing the English label
                                        if (newType === 'english_text' && (field.options as any)?.label_dv) {
                                            updates.options = { ...((field.options as any) || {}), label_dv: '' }
                                        }
                                        onUpdate(field.id, updates)
                                    }}
                                    className="block w-full rounded-md bg-white/5 py-1.5 px-3 text-base text-white outline-1 -outline-offset-1 outline-white/10 *:bg-gray-800 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 text-right font-faruma"
                                    dir="rtl"
                                >
                                    <option value="short_text">ކުރު ޖަވާބު</option>
                                    <option value="english_text">ކުރު ޖަވާބު (އިނގިރޭސި)</option>
                                    <option value="long_text">ދިގު ޖަވާބު</option>
                                    <option value="email">އީމެއިލް</option>
                                    <option value="number">އަދަދު</option>
                                    <option value="date">ތާރީޚް</option>
                                    <option value="checkbox">ޗެކްބޮކްސް</option>
                                    <option value="radio">މަލްޓިޕަލް ޗޮއިސް</option>
                                    <option value="dropdown">ޑްރޮޕްޑައުން</option>
                                    <option value="file">ފައިލް އަޕްލޯޑް</option>
                                    <option value="image">ފޮޓޯ</option>
                                    <option value="text_block">ލިޔުންކޮޅެއް</option>
                                    <option value="consent">އިޤްރާރު</option>
                                </select>
                            </div>
                        </div>

                        {/* Image Specific Controls */}
                        {field.type === 'image' && (
                            <div className="col-span-full space-y-4 rounded-lg bg-black/20 p-4 border border-white/5">
                                {/* Image Preview */}
                                {(field.options as any)?.imageUrl && (
                                    <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg bg-black/40 border border-white/10 mx-auto">
                                        <img
                                            src={(field.options as any).imageUrl}
                                            alt={(field.options as any)?.altText || 'Preview'}
                                            className="h-full w-full object-contain"
                                        />
                                    </div>
                                )}

                                {/* Upload or URL */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1 text-right font-faruma">ލިންކު</label>
                                        <input
                                            type="text"
                                            dir="ltr"
                                            value={(field.options as any)?.imageUrl || ''}
                                            onChange={(e) => onUpdate(field.id, {
                                                options: { ...(field.options as any || {}), imageUrl: e.target.value }
                                            })}
                                            placeholder="https://..."
                                            className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-sm text-white outline-1 -outline-offset-1 outline-white/10 focus:outline-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1 text-right font-faruma">އަލްޓް ޓެކްސްޓް</label>
                                        <input
                                            type="text"
                                            dir="rtl"
                                            value={(field.options as any)?.altText || ''}
                                            onChange={(e) => onUpdate(field.id, {
                                                options: { ...(field.options as any || {}), altText: latinToThaana(e.target.value) }
                                            })}
                                            placeholder="ފޮޓޯގެ ތަފްސީލް"
                                            className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-sm text-white text-right font-faruma outline-1 -outline-offset-1 outline-white/10 focus:outline-primary"
                                        />
                                    </div>
                                </div>

                                {/* Upload Button */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        id={`upload-${field.id}`}
                                        className="hidden"
                                        accept="image/png,image/jpeg,image/jpg"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                    />
                                    <label
                                        htmlFor={`upload-${field.id}`}
                                        className={`flex items-center justify-center gap-2 w-full rounded-md border border-dashed border-white/20 bg-white/5 py-4 text-sm text-gray-400 hover:bg-white/10 hover:border-white/40 hover:text-white transition-all cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isUploading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
                                        {isUploading ? 'ސޭވް ކުރެވެނީ...' : 'ފޮޓޯ ނެގުމަށް ފިއްތާލާ (PNG/JPG)'}
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Text Block & Consent Content */}
                        {(field.type === 'text_block' || field.type === 'consent') && (
                            <div className="col-span-full">
                                <label className="block text-sm text-gray-400 mb-1 text-right font-faruma">
                                    {field.type === 'consent' ? 'ތަފްސީލް / އެއްބަސްވުން' : 'ތަފްސީލު'}
                                </label>
                                <textarea
                                    rows={4}
                                    dir="rtl"
                                    value={(field.options as any)?.content_dv || ''}
                                    onChange={(e) => onUpdate(field.id, {
                                        options: { ...(field.options as any || {}), content_dv: latinToThaana(e.target.value) }
                                    })}
                                    placeholder={field.type === 'consent' ? 'އެއްބަސްވުން ލިޔުއްވާ...' : "ތަފްސީލު ލިޔުއްވާ..."}
                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-sm text-white text-right font-faruma outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                                ></textarea>
                            </div>
                        )}

                        {/* Placeholder (for text fields) */}
                        {(field.type === 'short_text' || field.type === 'long_text' || field.type === 'email' || field.type === 'number' || field.type === 'english_text') && (
                            <div className="col-span-full">
                                <label htmlFor={`placeholder-${field.id}`} className="block text-sm/6 text-white text-right font-faruma">
                                    މިސާލު
                                </label>
                                <div className="mt-2">
                                    <input
                                        type="text"
                                        value={(field.type === 'english_text' || field.type === 'email') ? field.placeholder || '' : (field.options as any)?.placeholder_dv || ''}
                                        onChange={(e) => {
                                            if (field.type === 'english_text' || field.type === 'email') {
                                                onUpdate(field.id, { placeholder: e.target.value })
                                            } else {
                                                onUpdate(field.id, {
                                                    options: { ...(field.options as any || {}), placeholder_dv: latinToThaana(e.target.value) }
                                                })
                                            }
                                        }}
                                        placeholder={(field.type === 'english_text' || field.type === 'email') ? 'e.g. Type here...' : "މިސާލު (ދިވެހި)..."}
                                        className={`block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 ${(field.type === 'english_text' || field.type === 'email') ? 'text-left font-sans' : 'text-right font-faruma'}`}
                                        dir={(field.type === 'english_text' || field.type === 'email') ? 'ltr' : 'rtl'}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Options Editor (for radio, checkbox, dropdown) */}
                        {(field.type === 'radio' || field.type === 'checkbox' || field.type === 'dropdown') && (
                            <div className="col-span-full">
                                <label className="block text-sm/6 text-white mb-4 text-right font-faruma">
                                    އޮޕްޝަންތައް
                                </label>
                                <div className="space-y-3">
                                    <div className="space-y-3">
                                        {(() => {
                                            // Get Dhivehi Options
                                            const itemsDv = ((field.options as any)?.items_dv || []) as string[];
                                            // Ensure we have some items if new
                                            const choices = itemsDv.length > 0 ? itemsDv : [''];

                                            return choices.map((option: string, idx: number) => (
                                                <div key={idx} className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-4 w-4 shrink-0 border border-white/20 ${field.type === 'radio' ? 'rounded-full' : 'rounded'} bg-white/5`} />

                                                        <input
                                                            type="text"
                                                            dir="rtl"
                                                            value={option || ''}
                                                            onChange={(e) => {
                                                                const currentOpts = Array.isArray(field.options) ? {} : (field.options as any) || {};
                                                                const newItemsDv = [...choices]
                                                                newItemsDv[idx] = latinToThaana(e.target.value)

                                                                // We should also ensure 'items' (english default) has same length to avoid index issues
                                                                const itemsEn = [...(currentOpts.items || [])];
                                                                while (itemsEn.length <= idx) itemsEn.push(`Option ${itemsEn.length + 1}`);

                                                                onUpdate(field.id, { options: { ...currentOpts, items_dv: newItemsDv, items: itemsEn } })
                                                            }}
                                                            placeholder="ޖަވާބު (ދިވެހި)..."
                                                            className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-sm text-white text-right font-faruma outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary border-l-2 border-primary/20"
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newChoices = choices.filter((_: any, i: number) => i !== idx)
                                                                const currentOpts = Array.isArray(field.options) ? {} : (field.options as any) || {};

                                                                // Also sync english items
                                                                const itemsEn = (currentOpts.items || []).filter((_: any, i: number) => i !== idx);

                                                                onUpdate(field.id, {
                                                                    options: {
                                                                        ...currentOpts,
                                                                        items_dv: newChoices,
                                                                        items: itemsEn
                                                                    }
                                                                })
                                                            }}
                                                            className="text-gray-500 hover:text-red-400"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        })()}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-gray-400 hover:text-white font-faruma"
                                        onClick={() => {
                                            const currentOpts = Array.isArray(field.options) ? {} : (field.options as any) || {};
                                            const itemsDv = (currentOpts?.items_dv || []) as string[];
                                            const newItemsDv = [...itemsDv, ''];

                                            // Perform sync with English array length
                                            const itemsEn = [...(currentOpts.items || [])];
                                            itemsEn.push(`Option ${itemsEn.length + 1}`);

                                            onUpdate(field.id, { options: { ...currentOpts, items_dv: newItemsDv, items: itemsEn } })
                                        }}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        އިތުރު އޮޕްޝަނެއް
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Required Toggle */}
                        {field.type !== 'image' && field.type !== 'text_block' && (
                            <div className="col-span-full">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-6 shrink-0 items-center">
                                        <input
                                            id={`required-${field.id}`}
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
                                            className="size-4 rounded border border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0"
                                        />
                                    </div>
                                    <label htmlFor={`required-${field.id}`} className="text-sm/6 text-white text-right font-faruma">
                                        ޖަވާބުނުދީ ދޫނުކުރެވޭނެ
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Force RTL for this layout, so no toggle needed. BUT we might want to ensure is_rtl is set to true in settings invisibly if needed for PublicForm */}
                        <div className="hidden">
                            {/* Invisible effect to ensure is_rtl is true for Dhivehi form items? 
                     Actually, PublicForm uses `is_rtl` option. We should probably force it to true when creating/updating field in Dhivehi Form.
                     Or, we rely on the fact that if it's a Dhivehi form, the PublicForm should know. 
                     But PublicForm logic currently checks `field.options.is_rtl`.
                     So we should probably set it to true by default or expose it hidden and checked.
                 */}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}

export default function DhivehiFormBuilder({ initialForm, initialFields }: { initialForm: Form, initialFields: FormField[] }) {
    const [form, setForm] = useState(initialForm)
    const [fields, setFields] = useState(initialFields)
    const [isSaving, setIsSaving] = useState(false)
    const [isPublishing, setIsPublishing] = useState(false)
    const [isToolboxOpen, setIsToolboxOpen] = useState(false)
    const [isShareOpen, setIsShareOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const router = useRouter()
    const { confirm, dialog } = useConfirmDialog()

    const { addToast } = useToast()
    const bottomRef = useRef<HTMLDivElement>(null)

    // Sync local state with server data when props change
    useEffect(() => {
        setFields(initialFields)
    }, [initialFields])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex((item) => item.id === active.id)
            const newIndex = fields.findIndex((item) => item.id === over.id)
            const newItems = arrayMove(fields, oldIndex, newIndex)

            setFields(newItems)
            reorderFields(form.id, newItems.map(f => f.id))
            setLastSaved(new Date())
            addToast('Fields reordered', 'success')
        }
    }

    const handleAddField = async (type: FormFieldType) => {
        setIsSaving(true)
        try {
            const result = await addField(form.id, type, fields.length)
            if (result.data) {
                // Force is_rtl to true for new fields in Dhivehi builder
                const newFieldRaw = result.data as FormField;
                // We need to update it immediately to set is_rtl if not present?
                // Ideally addField should handle it, but we can just update local state and let user save?
                // Or better, when rendering SortableField, we treat it as RTL.

                // Let's assume PublicForm handles RTL based on Form Settings or Field settings.
                // If Field settings, we should update it.
                // For now, let's just add it. The user can type dhivehi.

                // Actually, to ensure Public Form renders in RTL, we might need to set `is_rtl: true` in options.
                // Let's do an immediate update if needed, but for now just adding is fine.

                setFields([...fields, newFieldRaw])
                setLastSaved(new Date())
                setTimeout(() => {
                    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
            }
        } catch (error) {
            addToast('Failed to add field', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpdateField = async (id: string, updates: Partial<FormField>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))
        await updateField(id, form.id, updates)
        setLastSaved(new Date())
    }

    const handleDeleteField = async (id: string) => {
        // Store the original fields for rollback
        const previousFields = [...fields]

        try {
            // Optimistic update - remove from UI immediately
            setFields(fields.filter(f => f.id !== id))

            // Delete on server
            const result = await deleteField(id, form.id)

            if (result?.error) {
                throw new Error(result.error)
            }

            setLastSaved(new Date())
        } catch (error) {
            // Rollback on error - restore the field
            setFields(previousFields)
            addToast('Failed to delete question', 'error')
            console.error('Delete field error:', error)
        }
    }

    // Debounce the server update to prevent race conditions and excessive writes
    const debouncedUpdateForm = useDebouncedCallback(async (formData: Form) => {
        await updateFormDetails(formData.id, {
            title: formData.title,
            description: formData.description,
            settings: formData.settings
        }, formData.slug)
        setLastSaved(new Date())
        setIsSaving(false)
    }, 1000)

    const handleUpdateForm = (updates: { title?: string, description?: string | null, settings?: Json }) => {
        setForm(prev => {
            const next = { ...prev, ...updates } as Form
            setIsSaving(true)
            debouncedUpdateForm(next)
            return next
        })
    }

    const handleUpdateSettings = async (updates: { is_accepting_responses?: boolean, closes_at?: string | null }) => {
        setForm({ ...form, ...updates } as Form)
        await updateFormSettings(form.id, updates)
        setLastSaved(new Date())
        addToast('Settings updated', 'success')
    }

    const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/f/${form.slug}` : ''

    return (
        <div className="min-h-screen bg-gray-900 pb-20 pr-2 pl-2">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 border-b border-white/10 bg-gray-900/80 backdrop-blur-md">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between" dir="rtl">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                                <ChevronLeft className="h-5 w-5 rotate-180" /> {/* Rotated for RTL */}
                            </Link>
                            <div className="h-6 w-px bg-white/10" />
                            <div className="flex items-center gap-2 text-sm text-gray-400 font-faruma">
                                {isSaving ? (
                                    <span className="flex items-center gap-2 text-primary">
                                        <Save className="h-4 w-4 animate-spin" />
                                        <span className="hidden sm:inline">ސޭވް ކުރެވެނީ...</span>
                                    </span>
                                ) : lastSaved ? (
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span className="hidden sm:inline">ސޭވް ކުރެވިއްޖެ {lastSaved?.toLocaleTimeString()}</span>
                                    </span>
                                ) : (
                                    <span className="italic hidden sm:inline">އޮޓޯ ސޭވް</span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-primary font-waheed text-lg"
                                onClick={() => {
                                    if (fields.length === 0) {
                                        addToast('Please add at least one field to the form before previewing', 'error')
                                        return
                                    }
                                    window.open(`/f/${form.slug}`, '_blank')
                                }}
                            >
                                <Eye className="h-4 w-4 sm:ml-2" />
                                <span className="hidden sm:inline">ޕްރިވިއު</span>
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-primary font-waheed text-lg"
                                onClick={() => setIsSettingsOpen(true)}
                            >
                                <Settings className="h-4 w-4 sm:ml-2" />
                                <span className="hidden sm:inline">ސެޓިންގްސް</span>
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-primary font-waheed text-lg"
                                onClick={() => setIsShareOpen(true)}
                            >
                                <Share2 className="h-4 w-4 sm:ml-2" />
                                <span className="hidden sm:inline">ޝެއަރ</span>
                            </Button>

                            <button
                                type="button"
                                disabled={isPublishing}
                                onClick={async () => {
                                    if (isPublishing) return

                                    // Validation: Cannot publish empty form
                                    if (!form.is_published && fields.length === 0) {
                                        addToast('Cannot publish an empty form. Please add at least one field.', 'error')
                                        return
                                    }

                                    setIsPublishing(true)
                                    const newStatus = !form.is_published
                                    try {
                                        await togglePublish(form.id, newStatus)
                                        // Only update local state after server success
                                        setForm({ ...form, is_published: newStatus } as Form)
                                        setLastSaved(new Date())
                                        addToast(
                                            newStatus ? 'Form published successfully' : 'Form unpublished',
                                            newStatus ? 'success' : 'info'
                                        )
                                    } catch (error) {
                                        addToast('Failed to update form status', 'error')
                                    } finally {
                                        setIsPublishing(false)
                                    }
                                }}
                                className={`rounded-md px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-inter ${form.is_published
                                    ? 'bg-white/10 text-white hover:bg-white/20'
                                    : 'bg-primary text-white hover:bg-primary/90 focus-visible:outline-primary'
                                    }`}
                            >
                                {isPublishing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 inline ml-1.5 -mt-0.5 animate-spin" />
                                        <span className="hidden sm:inline">{form.is_published ? 'Unpublishing...' : 'Publishing...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Globe className="h-4 w-4 inline ml-0.5 -mt-0.5" />
                                        <span className="hidden sm:inline">{form.is_published ? 'Unpublish' : 'Publish'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
                    <div className="lg:col-span-3 space-y-8">

                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="space-y-6">
                                {/* Form Header Section */}
                                <div className="rounded-lg bg-white/5 ring-1 ring-white/10 p-6" dir="rtl">
                                    <div className="border-b border-white/10 pb-6 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg tracking-wide text-gray-500 font-waheed">ފޯމުގެ ތަފްސީލް</h2>
                                                <p className="mt-1 text-sm/6 text-gray-400 font-faruma">
                                                    ފޯމުގެ ނަމާއި ތަފްސީލް ލިޔުއްވާ
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                                        <div className="col-span-full">
                                            <label htmlFor="form-title" className="block text-lg tracking-wide text-gray-300 font-waheed">
                                                ފޯމުގެ ނަން
                                            </label>
                                            <div className="mt-2">
                                                <input
                                                    id="form-title"
                                                    type="text"
                                                    value={form.title}
                                                    onChange={(e) => handleUpdateForm({ title: latinToThaana(e.target.value) })}
                                                    placeholder="ފޯމުގެ ނަން..."
                                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 font-faruma"
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-full">
                                            <label htmlFor="form-description" className="block text-lg tracking-wide text-gray-300 font-waheed">
                                                ތަފްސީލް
                                            </label>
                                            <div className="mt-2">
                                                <textarea
                                                    id="form-description"
                                                    rows={3}
                                                    value={form.description || ''}
                                                    onChange={(e) => handleUpdateForm({ description: latinToThaana(e.target.value) })}
                                                    placeholder="އިތުރު ތަފްސީލް..."
                                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 font-faruma"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Fields Section */}
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={fields.map(f => f.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div>
                                            {fields.length === 0 ? (
                                                <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-lg bg-white/5 font-faruma">
                                                    <p className="text-gray-400">ސުވާލެއް އިތުރުކުރައްވާ!</p>
                                                </div>
                                            ) : (
                                                fields.map((field) => (
                                                    <SortableField
                                                        key={field.id}
                                                        field={field}
                                                        onUpdate={handleUpdateField}
                                                        onDelete={handleDeleteField}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                                <div ref={bottomRef} />
                            </div>
                        </form>
                    </div>

                    <div className="hidden lg:block lg:col-span-1">
                        <div className="sticky top-28 space-y-8">
                            <FormToolbox onAddField={handleAddField} variant="dhivehi" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Dialog */}
            <Dialog open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
                <DialogContent className="sm:max-w-md bg-gray-900 border-white/10 text-white">
                    <DialogHeader className="text-right space-y-3">
                        <DialogTitle className="font-faruma">ފޯމުގެ ސެޓިންގްސް</DialogTitle>
                        <DialogDescription className="text-gray-400 font-faruma text-sm">
                            ފޯމު ބަލައިގަތުމާއި ގުޅޭ ސެޓިންގްސް
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 mt-4" dir="rtl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-base font-medium text-white font-faruma">ޖަވާބު ބަލައިގަތުން</h4>
                                <p className="text-xs text-gray-400 font-faruma">މެނުއަލްކޮށް ފޯމު ހުޅުވާ/ބަންދުކުރުމަށް</p>
                            </div>
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={form.is_accepting_responses}
                                    onClick={() => handleUpdateSettings({ is_accepting_responses: !form.is_accepting_responses })}
                                    className={`${form.is_accepting_responses ? 'bg-primary' : 'bg-white/10'} relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`${form.is_accepting_responses ? '-translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                    />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="closes_at_dv" className="block text-sm font-medium text-white font-faruma">
                                އޮޓަމެޓިކުން ބަންދުވާ ގަޑި (އިޚްތިޔާރީ)
                            </label>
                            <input
                                type="datetime-local"
                                id="closes_at_dv"
                                value={form.closes_at ? new Date(form.closes_at).toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                    const val = e.target.value ? new Date(e.target.value).toISOString() : null
                                    handleUpdateSettings({ closes_at: val })
                                }}
                                className="block w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-right [color-scheme:dark]"
                            />
                            <p className="text-xs text-gray-400 font-faruma">މި ގަޑީގެ ފަހުން ފޯމަށް ޖަވާބު ބަލައެއް ނުގަނެވޭނެ.</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Share Dialog */}
            <Dialog open={isShareOpen} onClose={() => setIsShareOpen(false)}>
                <DialogContent className="sm:max-w-md bg-gray-900 border-white/10 text-white">
                    <DialogHeader onClose={() => setIsShareOpen(false)}>
                        <DialogTitle className="font-waheed text-right">ފޯމު ޝެއަރކުރައްވާ</DialogTitle>
                        <DialogDescription className="text-gray-400 font-waheed text-right">
                            މި ލިންކު މެދުވެރިކޮށް ކޮންމެ ބޭފުޅަކަށްވެސް ފޯމު ހުށަހެޅޭނެއެވެ.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 mt-4" dir="ltr">
                        <Button
                            type="submit"
                            size="sm"
                            className="px-3"
                            onClick={() => {
                                navigator.clipboard.writeText(publicUrl)
                                addToast('Link copied to clipboard', 'success')
                            }}
                        >
                            <span className="sr-only">Copy</span>
                            <Copy className="h-4 w-4" />
                        </Button>
                        <div className="grid flex-1 gap-2">
                            <label htmlFor="link" className="sr-only">
                                Link
                            </label>
                            <input
                                id="link"
                                readOnly
                                value={publicUrl}
                                className="col-span-3 w-full rounded-md bg-white/5 px-3 py-2 text-sm text-gray-300 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-right"
                            />
                        </div>

                    </div>
                </DialogContent>
            </Dialog>
            {/* Mobile Toolbox FAB */}
            <button
                onClick={() => setIsToolboxOpen(true)}
                className="fixed bottom-6 right-6 lg:hidden h-14 w-14 rounded-full bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center hover:bg-primary/90 transition-colors z-[100]"
                aria-label="ބައިތައް އިތުރުކުރައްވާ"
            >
                <Plus className="h-6 w-6" />
            </button>

            {/* Mobile Toolbox Modal */}
            <Dialog open={isToolboxOpen} onClose={() => setIsToolboxOpen(false)}>
                <DialogContent className="sm:max-w-md bg-gray-900 border-white/10 text-white max-h-[80vh] overflow-y-auto">
                    <DialogHeader onClose={() => setIsToolboxOpen(false)}>
                        <DialogTitle className="text-right font-faruma">ބައިތައް އިތުރުކުރައްވާ</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        <FormToolbox
                            onAddField={async (type) => {
                                await handleAddField(type)
                                setIsToolboxOpen(false)
                            }}
                            variant="dhivehi"
                            className="bg-transparent ring-0 p-0 shadow-none static"
                            isModal={true}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
