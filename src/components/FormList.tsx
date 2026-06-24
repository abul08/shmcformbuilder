'use client'

import { Form } from '@/types'
import { Edit2, Trash2, ExternalLink, MessageSquare, Loader2, LayoutTemplate, FolderPlus, Folder, X } from 'lucide-react'
import Link from 'next/link'
import { createFormFolder, deleteForm, saveFormAsTemplate, updateFormFolder } from '@/actions/forms'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import AssignFormModal from '@/components/AssignFormModal'
import { UserCog } from 'lucide-react'

export default function FormList({ initialForms, isSuperUser = false, currentUserId }: { initialForms: Form[], isSuperUser?: boolean, currentUserId?: string }) {
  const [forms, setForms] = useState(initialForms)
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null)
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)
  const [selectedFolderFormIds, setSelectedFolderFormIds] = useState<string[]>([])
  const [openFolderName, setOpenFolderName] = useState<string | null>(null)
  const [movingFormId, setMovingFormId] = useState<string | null>(null)
  const [draggingFormId, setDraggingFormId] = useState<string | null>(null)
  const [dragOverFolderName, setDragOverFolderName] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedForm, setSelectedForm] = useState<{ id: string, title: string } | null>(null)
  const router = useRouter()
  const { confirm, dialog } = useConfirmDialog()
  const { addToast } = useToast()

  const getProfileName = (profile: any) => profile?.full_name || profile?.username || 'Unknown user'
  const getCreatorId = (form: Form) => ((form.settings as any) || {}).created_by || form.user_id
  const isOtherAdminForm = (form: Form) => {
    const creatorProfile = (form as any)._creator_profile
    const creatorId = getCreatorId(form)
    return Boolean(isSuperUser && currentUserId && creatorProfile?.role === 'SUPER_USER' && creatorId !== currentUserId)
  }
  const primaryForms = isSuperUser ? forms.filter((form) => !isOtherAdminForm(form)) : forms
  const otherAdminForms = isSuperUser ? forms.filter(isOtherAdminForm) : []

  // Sync local state with server data when initialForms changes
  useEffect(() => {
    setForms(initialForms)
  }, [initialForms])

  const folderNames = Array.from(new Set(primaryForms.map((form) => ((form.settings as any) || {}).folder_name).filter(Boolean))).sort()
  const formsByFolder = primaryForms.reduce((groups: Record<string, Form[]>, form) => {
    const folderName = ((form.settings as any) || {}).folder_name || 'Unfiled'
    groups[folderName] = groups[folderName] || []
    groups[folderName].push(form)
    return groups
  }, {})
  const realFolderNames = folderNames
  const unfiledForms = formsByFolder.Unfiled || []
  const openFolderForms = openFolderName ? formsByFolder[openFolderName] || [] : []

  const toggleSelectedFolderForm = (formId: string) => {
    setSelectedFolderFormIds(prev =>
      prev.includes(formId)
        ? prev.filter(id => id !== formId)
        : [...prev, formId]
    )
  }

  const handleCreateFolder = async (formData: FormData) => {
    const folderName = (formData.get('folderName') as string || '').trim()
    selectedFolderFormIds.forEach(id => formData.append('formIds', id))

    setCreatingFolder(true)
    try {
      const result = await createFormFolder(formData)
      if (result?.error) {
        addToast(result.error, 'error')
        return
      }

      addToast('Folder created successfully', 'success')
      setForms(prev => prev.map(form => {
        if (!selectedFolderFormIds.includes(form.id)) return form
        const settings = {
          ...((form.settings as any) || {}),
          folder_name: folderName,
        }
        return { ...form, settings }
      }))
      setSelectedFolderFormIds([])
      setIsFolderDialogOpen(false)
      router.refresh()
    } catch (error) {
      addToast('Failed to create folder', 'error')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleMoveForm = async (formId: string, folderName: string) => {
    setMovingFormId(formId)
    try {
      const result = await updateFormFolder(formId, folderName === '__none__' ? null : folderName)
      if (result?.error) {
        addToast(result.error, 'error')
        return
      }

      setForms(prev => prev.map(form => {
        if (form.id !== formId) return form
        const settings = { ...(((form.settings as any) || {})) }
        if (folderName === '__none__') {
          delete settings.folder_name
        } else {
          settings.folder_name = folderName
        }
        return { ...form, settings }
      }))
      addToast('Form moved', 'success')
      router.refresh()
    } catch (error) {
      addToast('Failed to move form', 'error')
    } finally {
      setMovingFormId(null)
    }
  }

  const handleDragStart = (formId: string, event: React.DragEvent<HTMLDivElement>) => {
    setDraggingFormId(formId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', formId)
  }

  const handleDragEnd = () => {
    setDraggingFormId(null)
    setDragOverFolderName(null)
  }

  const handleFolderDrop = (folderName: string, event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const formId = event.dataTransfer.getData('text/plain') || draggingFormId
    setDraggingFormId(null)
    setDragOverFolderName(null)

    if (!formId) return

    const form = forms.find((item) => item.id === formId)
    const currentFolder = ((form?.settings as any) || {}).folder_name

    if (currentFolder === folderName) return

    handleMoveForm(formId, folderName)
  }

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

  const handleSaveAsTemplate = async (formId: string) => {
    if (savingTemplateId) return
    setSavingTemplateId(formId)
    try {
      const result = await saveFormAsTemplate(formId)
      if (!result?.error) {
        addToast('Template saved successfully', 'success')
        router.refresh()
        setTimeout(() => router.refresh(), 100)
      } else {
        addToast(result.error || 'Failed to save template', 'error')
      }
    } catch (error) {
      addToast('Failed to save template', 'error')
    } finally {
      setSavingTemplateId(null)
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
    if (target.closest('button') || target.closest('a') || target.closest('select')) {
      return
    }
    router.push(`/forms/${id}/edit`)
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              Folders
            </h2>
            <p className="text-sm text-gray-500">Create folders and organize your forms the way you prefer.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsFolderDialogOpen(true)}
            className="w-full sm:w-auto rounded-md bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors flex items-center justify-center gap-2 border border-white/10"
          >
            <FolderPlus className="h-4 w-4" />
            Create Folder
          </button>
        </div>

        {realFolderNames.length > 0 && (
          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {realFolderNames.map((folderName) => (
                <button
                  key={folderName}
                  type="button"
                  onClick={() => setOpenFolderName(folderName)}
                  onDragOver={(event) => {
                    if (!draggingFormId) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                  }}
                  onDragEnter={() => {
                    if (draggingFormId) setDragOverFolderName(folderName)
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setDragOverFolderName(null)
                    }
                  }}
                  onDrop={(event) => handleFolderDrop(folderName, event)}
                  className={`group flex min-h-36 flex-col justify-between rounded-xl bg-gray-800/40 border transition-all duration-300 p-5 text-left shadow-sm hover:shadow-md hover:shadow-primary/5 ${
                    dragOverFolderName === folderName
                      ? 'border-primary/70 bg-primary/10 ring-2 ring-primary/30'
                      : 'border-white/5 hover:border-primary/30 hover:bg-gray-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-lg bg-primary/10 p-3 text-primary">
                      <Folder className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-400">
                      {formsByFolder[folderName]?.length || 0} form{(formsByFolder[folderName]?.length || 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div>
                    <h3 className="mt-5 line-clamp-2 text-base font-semibold text-white group-hover:text-primary transition-colors">
                      {folderName}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {dragOverFolderName === folderName ? 'Drop form here' : 'Open folder'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {unfiledForms.length > 0 && (
          <section className="space-y-4">
            {realFolderNames.length > 0 && (
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-white">Forms</h3>
                  <p className="text-xs text-gray-500">Drag a form card onto a folder to move it.</p>
                </div>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {unfiledForms.map((form) => {
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
              draggable={realFolderNames.length > 0}
              onDragStart={(event) => handleDragStart(form.id, event)}
              onDragEnd={handleDragEnd}
              onClick={(e) => handleCardClick(form.id, e)}
              className={`group relative flex flex-col justify-between rounded-xl bg-gray-800/40 border border-white/5 hover:border-white/10 hover:bg-gray-800/60 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm hover:shadow-md hover:shadow-primary/5 ${
                draggingFormId === form.id ? 'opacity-60 ring-2 ring-primary/30' : ''
              }`}
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
                  {isSuperUser && (
                    <p className="text-xs text-gray-500">
                      Created by <span className="font-medium text-gray-300">{getProfileName((form as any)._creator_profile)}</span>
                      {(form as any)._owner_profile && getCreatorId(form) !== form.user_id && (
                        <span> · Assigned to <span className="font-medium text-gray-300">{getProfileName((form as any)._owner_profile)}</span></span>
                      )}
                    </p>
                  )}
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
                      handleSaveAsTemplate(form.id)
                    }}
                    disabled={savingTemplateId === form.id}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
                    title="Save as Template"
                  >
                    {savingTemplateId === form.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LayoutTemplate className="h-4 w-4" />
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
            </div>
          </section>
        )}

        {otherAdminForms.length > 0 && (
          <section className="space-y-4 border-t border-white/10 pt-8">
            <div>
              <h3 className="text-base font-semibold text-white">Other admin forms</h3>
              <p className="text-xs text-gray-500">Forms created by other super admins.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {otherAdminForms.map((form) => {
                const settings = form.settings as any || {}
                const formType = settings.form_type
                const formNumber = settings.form_number
                const responseCount = (form as any).form_responses?.[0]?.count || 0

                return (
                  <div
                    key={form.id}
                    onClick={(e) => handleCardClick(form.id, e)}
                    className="group relative flex flex-col justify-between rounded-xl bg-gray-800/40 border border-purple-500/10 hover:border-purple-500/25 hover:bg-gray-800/60 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm"
                  >
                    <div className="p-6 flex-grow flex flex-col">
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

                      <div className="mb-6 space-y-2 flex-grow">
                        <h3 className="text-lg font-semibold text-gray-300 group-hover:text-primary transition-colors line-clamp-2" dir="auto">
                          {form.title}
                        </h3>
                        <p className="text-sm text-gray-400 line-clamp-3" dir="auto">
                          {form.description || 'No description provided'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created by <span className="font-medium text-gray-300">{getProfileName((form as any)._creator_profile)}</span>
                          {(form as any)._owner_profile && getCreatorId(form) !== form.user_id && (
                            <span> · Assigned to <span className="font-medium text-gray-300">{getProfileName((form as any)._owner_profile)}</span></span>
                          )}
                        </p>
                      </div>

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

                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gray-900/90 backdrop-blur-sm border-t border-white/10 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex justify-between items-center z-10">
                      <div className="flex gap-1">
                        <Link
                          href={`/forms/${form.id}/edit`}
                          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-300 transition-colors"
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
                            handleAssignClick(form.id, form.title)
                          }}
                          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-300 transition-colors"
                          title="Assign to User"
                        >
                          <UserCog className="h-4 w-4" />
                        </button>
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
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
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

      <Dialog open={!!openFolderName} onClose={() => setOpenFolderName(null)} className="max-w-4xl">
        <DialogContent className="bg-gray-900 border-white/10 text-white p-0">
          <DialogHeader onClose={() => setOpenFolderName(null)} className="bg-white/[0.03] px-5 py-4 sm:px-6">
            <DialogTitle className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Folder className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base sm:text-lg">{openFolderName || 'Folder'}</span>
                <span className="mt-0.5 block text-xs font-normal text-gray-500">
                  {openFolderForms.length} form{openFolderForms.length === 1 ? '' : 's'}
                </span>
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Forms saved inside this folder.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">
            {openFolderForms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-white/5 text-gray-500">
                  <Folder className="h-7 w-7" />
                </div>
                <p className="mt-4 text-sm font-medium text-white">This folder is empty</p>
                <p className="mt-1 text-xs text-gray-500">Drag forms from the dashboard onto this folder.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-white/10">
                {openFolderForms.map((form) => {
                  const responseCount = (form as any).form_responses?.[0]?.count || 0

                  return (
                    <div
                      key={form.id}
                      className="border-b border-white/10 bg-white/[0.025] p-4 last:border-b-0 hover:bg-white/[0.045] transition-colors"
                    >
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="min-w-0 truncate text-sm font-semibold text-white" dir="auto">
                              {form.title}
                            </h3>
                            <Badge variant={form.is_published ? 'success' : 'secondary'} className="shrink-0 shadow-none">
                              {form.is_published ? 'Live' : 'Draft'}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-gray-400" dir="auto">
                            {form.description || 'No description provided'}
                          </p>
                          {isSuperUser && (
                            <p className="text-xs text-gray-500">
                              Created by <span className="font-medium text-gray-300">{getProfileName((form as any)._creator_profile)}</span>
                              {(form as any)._owner_profile && getCreatorId(form) !== form.user_id && (
                                <span> · Assigned to <span className="font-medium text-gray-300">{getProfileName((form as any)._owner_profile)}</span></span>
                              )}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <Edit2 className="h-3 w-3" />
                              Updated {new Date(form.updated_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MessageSquare className="h-3 w-3" />
                              {responseCount} response{responseCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                          <Link
                            href={`/forms/${form.id}/edit`}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                            title="Edit Form"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </Link>
                          <Link
                            href={`/forms/${form.id}/responses`}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                            title="View Responses"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Responses
                          </Link>
                          {form.is_published && (
                            <Link
                              href={`/f/${form.slug}`}
                              target="_blank"
                              className="inline-flex items-center justify-center rounded-md border border-primary/20 bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20 hover:text-primary-300"
                              title="View Public Form"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => handleMoveForm(form.id, '__none__')}
                            disabled={movingFormId === form.id}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/20 hover:text-red-100 disabled:opacity-50"
                          >
                            {movingFormId === form.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                            Remove from folder
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFolderDialogOpen} onClose={() => { if (!creatingFolder) setIsFolderDialogOpen(false) }} className="max-w-2xl">
        <DialogContent className="bg-gray-900 border-white/10 text-white">
          <DialogHeader onClose={() => { if (!creatingFolder) setIsFolderDialogOpen(false) }}>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" />
              Create Folder
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Name the folder and select the forms you want to add.
            </DialogDescription>
          </DialogHeader>

          <form action={handleCreateFolder} className="space-y-5 mt-4">
            <div>
              <label htmlFor="folder-name" className="block text-sm font-medium text-white mb-2">
                Folder Name
              </label>
              <input
                id="folder-name"
                name="folderName"
                required
                placeholder="e.g. Registration Forms"
                disabled={creatingFolder}
                className="block w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-white">Forms</label>
                <span className="text-xs text-gray-500">{selectedFolderFormIds.length} selected</span>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
                {primaryForms.map((form) => {
                  const settings = (form.settings as any) || {}
                  return (
                    <label key={form.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFolderFormIds.includes(form.id)}
                        onChange={() => toggleSelectedFolderForm(form.id)}
                        disabled={creatingFolder}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-white truncate">{form.title}</span>
                        <span className="block text-xs text-gray-400 truncate">
                          {settings.folder_name ? `Currently in ${settings.folder_name}` : 'Unfiled'}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingFolder}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors disabled:opacity-50"
            >
              {creatingFolder ? 'Creating...' : 'Create Folder'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
