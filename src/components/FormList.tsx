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

import AssignFormModal from '@/components/AssignFormModal'
import { UserCog } from 'lucide-react'

export default function FormList({ initialForms, isSuperUser = false }: { initialForms: Form[], isSuperUser?: boolean }) {
  const [forms, setForms] = useState(initialForms)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedForm, setSelectedForm] = useState<{ id: string, title: string } | null>(null)
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

  const handleAssignClick = (formId: string, formTitle: string) => {
    setSelectedForm({ id: formId, title: formTitle })
    setAssignModalOpen(true)
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
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {forms.map((form) => {
          const isDhivehiTitle = /[\u0780-\u07BF]/.test(form.title || '');
          const titleClass = isDhivehiTitle ? 'font-waheed text-right text-xl leading-relaxed' : 'text-lg font-inter font-semibold text-left';

          const isDhivehiDesc = /[\u0780-\u07BF]/.test(form.description || '');
          const descClass = isDhivehiDesc ? 'font-faruma text-right leading-loose' : 'font-inter text-left';

          const settings = form.settings as any || {};
          const formType = settings.form_type;
          const formNumber = settings.form_number;
          const responseCount = (form as any).form_responses?.[0]?.count || 0;

          return (
            <div
              key={form.id}
              onClick={(e) => handleCardClick(form.id, e)}
              className="group relative flex flex-col justify-between rounded-xl bg-gray-800/40 border border-white/5 hover:border-white/10 hover:bg-gray-800/60 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm hover:shadow-md hover:shadow-primary/5"
            >
              {/* Card Content */}
              <div className="p-6 flex-grow flex flex-col">
                {/* Header Badges */}
                <div className="flex justify-between items-start gap-3 mb-4">
                  <div className="flex-1 flex flex-wrap gap-2">
                    {formType && (
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-primary/20 bg-primary/5 text-primary-300 ${/[\u0780-\u07BF]/.test(formType) ? 'font-faruma' : ''}`}>
                        {formType}
                      </span>
                    )}
                    {formNumber && (
                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/20 bg-gray-500/5 text-gray-400">
                        #{formNumber}
                      </span>
                    )}
                  </div>
                  <Badge variant={form.is_published ? 'success' : 'secondary'} className="shrink-0 shadow-none">
                    {form.is_published ? 'Live' : 'Draft'}
                  </Badge>
                </div>

                {/* Title & Description */}
                <div className="mb-6 space-y-2 flex-grow">
                  <h3 className={`text-gray-400 group-hover:text-primary transition-colors line-clamp-2 ${titleClass}`} dir="auto">
                    {form.title}
                  </h3>
                  <p className={`text-sm text-gray-400 line-clamp-3 ${descClass}`} dir="auto">
                    {form.description || 'No description provided'}
                  </p>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-gray-500 mt-auto">
                  <span className="flex items-center gap-1.5">
                    <Edit2 className="h-3 w-3" />
                    {form.is_published && (form as any).published_at
                      ? `Published ${new Date((form as any).published_at).toLocaleDateString()}`
                      : `Updated ${new Date(form.updated_at).toLocaleDateString()}`
                    }
                  </span>
                  <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${responseCount > 0 ? 'bg-primary/10 text-primary-300' : 'bg-white/5 text-gray-500'}`}>
                    <MessageSquare className="h-3 w-3" />
                    {responseCount}
                  </span>
                </div>
              </div>

              {/* Hover Actions Overlay */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gray-900/90 backdrop-blur-sm border-t border-white/10 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex justify-between items-center z-10">
                <div className="flex gap-1">
                  <Link
                    href={`/forms/${form.id}/edit`}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-300 transition-colors tooltip-trigger"
                    title="Edit Form"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/forms/${form.id}/responses`}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-300 transition-colors"
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
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
                    title="Duplicate"
                  >
                    {duplicatingId === form.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  {isSuperUser && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAssignClick(form.id, form.title)
                      }}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-300 transition-colors"
                      title="Assign to User"
                    >
                      <UserCog className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex gap-1 border-l border-white/10 pl-1">
                  {form.is_published && (
                    <Link
                      href={`/f/${form.slug}`}
                      target="_blank"
                      className="p-2 rounded-lg hover:bg-primary/20 text-primary hover:text-primary-300 transition-colors"
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
                    className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {dialog}
      </div>

      {selectedForm && (
        <AssignFormModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          formId={selectedForm.id}
          formTitle={selectedForm.title}
        />
      )}
    </>
  )
}
