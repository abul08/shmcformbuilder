'use client'

import { Form } from '@/types'
import { Edit2, Trash2, Copy, ExternalLink, MessageSquare, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { deleteForm, duplicateForm } from '@/actions/forms'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'

export default function FormList({ initialForms }: { initialForms: Form[] }) {
  const [forms, setForms] = useState(initialForms)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const router = useRouter()
  const { confirm, dialog } = useConfirmDialog()
  const { addToast } = useToast()

  // Sync local state with server data when initialForms changes
  useEffect(() => {
    setForms(initialForms)
  }, [initialForms])

  const handleDelete = async (formId: string) => {
    const confirmed = await confirm({
      title: 'Delete form?',
      description: 'This will permanently delete the form and all its responses. This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    })

    if (confirmed) {
      // Optimistic update - remove from UI immediately
      setForms(prevForms => prevForms.filter(f => f.id !== formId))

      try {
        await deleteForm(formId)
        addToast('Form deleted successfully', 'success')
      } catch (error) {
        // Revert optimistic update on error
        setForms(initialForms)
        addToast('Failed to delete form', 'error')
      }
    }
  }

  const handleDuplicate = async (formId: string) => {
    if (duplicatingId) return
    setDuplicatingId(formId)
    try {
      const result = await duplicateForm(formId)
      if (!result?.error) {
        addToast('Form duplicated successfully', 'success')
        // Refresh immediately to show the new form
        router.refresh()
        // Force a small delay to ensure the server has processed
        setTimeout(() => router.refresh(), 100)
      } else {
        addToast('Failed to duplicate form', 'error')
      }
    } catch (error) {
      addToast('Failed to duplicate form', 'error')
    } finally {
      setDuplicatingId(null)
    }
  }

  if (forms.length === 0) {
    return (
      <div className="text-center rounded-lg border border-dashed border-white/25 px-6 py-20">
        <div className="mx-auto size-12 text-gray-500 mb-4">
          <Edit2 className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-base font-semibold text-white">No forms found</h3>
        <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
          Start by creating your first form to collect responses.
        </p>
      </div>
    )
  }

  const handleCardClick = (id: string, e: React.MouseEvent) => {
    // Only navigate if the click wasn't on a button or link
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) {
      return
    }
    router.push(`/forms/${id}/edit`)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {forms.map((form) => (
        <div
          key={form.id}
          onClick={(e) => handleCardClick(form.id, e)}
          className="group relative rounded-lg bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition-all cursor-pointer overflow-hidden"
        >
          <div className="p-5">
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className="text-base font-semibold text-white truncate group-hover:text-primary transition-colors">
                {form.title}
              </h3>
              <Badge variant={form.is_published ? 'success' : 'secondary'} className="shrink-0">
                {form.is_published ? 'Live' : 'Draft'}
              </Badge>
            </div>

            <p className="text-sm text-gray-400 line-clamp-2 min-h-[2.5rem] mb-4">
              {form.description || 'No description provided'}
            </p>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Edit2 className="h-3 w-3" />
              <span>{new Date(form.updated_at).toLocaleDateString()}</span>
              {(form as any).form_responses && (form as any).form_responses[0] && (
                <>
                  <span className="mx-1">•</span>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{(form as any).form_responses[0].count} responses</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/5 px-3 py-2 flex justify-between gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <div className="flex gap-1">
              <Link
                href={`/forms/${form.id}/edit`}
                className="rounded p-1.5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Edit Form"
              >
                <Edit2 className="h-4 w-4" />
              </Link>
              <Link
                href={`/forms/${form.id}/responses`}
                className="rounded p-1.5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="View Responses"
              >
                <MessageSquare className="h-4 w-4" />
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDuplicate(form.id)
                }}
                disabled={duplicatingId === form.id}
                className="rounded p-1.5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Duplicate"
              >
                {duplicatingId === form.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex gap-1">
              {form.is_published && (
                <Link
                  href={`/f/${form.slug}`}
                  target="_blank"
                  className="rounded p-1.5 hover:bg-white/10 text-primary hover:text-primary/80 transition-colors"
                  title="View Public Form"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(form.id)
                }}
                className="rounded p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
      {dialog}
    </div>
  )
}
