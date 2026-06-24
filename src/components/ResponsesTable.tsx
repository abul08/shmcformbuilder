'use client'

import { Form, FormField, FormResponse, FormAnswer } from '@/types'
import { Download, Search, Table as TableIcon, Filter, ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { useState, Fragment } from 'react'
import { useToast } from '@/components/ui/toast'
import { getFileIcon, formatFileSize } from '@/lib/fileUpload'
import { getSignedUrl } from '@/actions/files'
import { Trash2, Loader2 } from 'lucide-react'
import { clearFormResponses, deleteFormResponse } from '@/actions/responses'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from 'next/navigation'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'

interface ResponseWithAnswers extends FormResponse {
  form_answers: FormAnswer[]
}

export default function ResponsesTable({
  form,
  fields,
  responses
}: {
  form: Form,
  fields: FormField[],
  responses: ResponseWithAnswers[]
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const { addToast } = useToast()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [fileActionKey, setFileActionKey] = useState<string | null>(null)
  const [deletingResponseId, setDeletingResponseId] = useState<string | null>(null)
  const router = useRouter()
  const { confirm, dialog } = useConfirmDialog()

  const handleClearResponses = () => {
    setConfirmText('')
    setIsConfirmOpen(true)
  }

  const confirmClear = async () => {
    if (confirmText !== 'DELETE') return

    setIsClearing(true)
    setIsConfirmOpen(false) // Close dialog so we can see the loading state on the button

    try {
      const result = await clearFormResponses(form.id)
      if (result.error) {
        addToast(result.error, 'error')
      } else {
        addToast('All responses cleared successfully', 'success')
        router.refresh()
      }
    } catch (error) {
      addToast('Failed to clear responses', 'error')
    } finally {
      setIsClearing(false)
    }
  }

  const handleFileAction = async (fileData: any, mode: 'preview' | 'download') => {
    const key = `${mode}:${fileData.filePath || fileData.fileUrl || fileData.fileName}`
    setFileActionKey(key)

    try {
      const result: { url?: string; error?: string } = fileData.filePath
        ? await getSignedUrl(
          fileData.filePath,
          'form-uploads',
          form.id,
          mode === 'download' ? fileData.fileName : undefined
        )
        : { url: fileData.fileUrl }

      if (!result.url) {
        addToast(result.error || 'Could not open file', 'error')
        return
      }

      const link = document.createElement('a')
      link.href = result.url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      if (mode === 'download') {
        link.download = fileData.fileName || 'uploaded-file'
      }
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      addToast('Could not open file', 'error')
    } finally {
      setFileActionKey(null)
    }
  }

  const handleDeleteResponse = async (responseId: string) => {
    const confirmed = await confirm({
      title: 'Delete response?',
      description: 'Delete this response? This will permanently remove the response, its answers, and any uploaded files attached to it.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    })
    if (!confirmed) return

    setDeletingResponseId(responseId)

    try {
      const result = await deleteFormResponse(form.id, responseId)
      if (result.error) {
        addToast(result.error, 'error')
        return
      }

      setExpandedRows(prev => {
        const next = new Set(prev)
        next.delete(responseId)
        return next
      })
      addToast('Response deleted', 'success')
      router.refresh()
    } catch (error) {
      addToast('Failed to delete response', 'error')
    } finally {
      setDeletingResponseId(null)
    }
  }

  const sortedFields = [...fields]
    .filter(f => !['section_header', 'text_block', 'image', 'size_table', 'bank_account'].includes(f.type))
    .sort((a, b) => a.order_index - b.order_index)

  const sizeTableFields = [...fields]
    .filter(f => f.type === 'size_table')
    .sort((a, b) => a.order_index - b.order_index)

  const toggleRow = (id: string) =>
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const exportToCsv = () => {
    try {
      const allFields = [...fields].sort((a, b) => a.order_index - b.order_index)
      const regularFields = allFields.filter(
        f => !['section_header', 'text_block', 'image', 'layout', 'size_table', 'bank_account'].includes(f.type)
      )
      const sizeFieldsForExport = allFields.filter(f => f.type === 'size_table')

      const mainHeaders = [
        '#',
        'Submitted At',
        ...regularFields.map(f => (f.options as any)?.label_dv || f.label || f.type),
      ]

      const mainRows = responses.map((r, idx) => {
        const cols = regularFields.map(f => {
          const ans = r.form_answers.find(a => a.field_id === f.id)
          const val = ans?.value
          if (val === null || val === undefined) return ''
          if (f.type === 'file' && typeof val === 'object' && val !== null && 'fileName' in (val as object)) {
            return (val as any).fileName || 'Uploaded file'
          }
          if (Array.isArray(val)) return val.join(', ')
          if (typeof val === 'object') return JSON.stringify(val)
          return val
        })
        return [idx + 1, new Date(r.submitted_at).toLocaleString(), ...cols]
      })

      const csvRows: Array<Array<string | number>> = [
        ['Responses'],
        mainHeaders,
        ...mainRows,
      ]

      if (sizeFieldsForExport.length > 0) {
        const nameField = regularFields.find(f =>
          f.label.toLowerCase().includes('name') ||
          f.label.includes('ނަން') ||
          (f.options as any)?.label_dv?.includes('ނަން')
        ) || regularFields.find(f => f.type === 'short_text' || f.type === 'english_text' || f.type === 'dhivehi_text')

        const sizeHeaders = ['#', 'Submitted At', 'Name', 'Field', 'Category', 'Sleeve', 'Size', 'Quantity', 'Unit Price', 'Total']
        const sizeRows: (string | number)[][] = []

        responses.forEach((r, idx) => {
          let respondentName = '-'
          if (nameField) {
            const nameAns = r.form_answers.find(a => a.field_id === nameField.id)
            if (nameAns && nameAns.value) respondentName = String(nameAns.value)
          }

          sizeFieldsForExport.forEach(f => {
            const ans = r.form_answers.find(a => a.field_id === f.id)
            const val = ans?.value as Record<string, any> | null | undefined
            if (!val || typeof val !== 'object') return

            const cats: { name: string; sizes: string[]; price?: number }[] = (f.options as any)?.categories || []
            cats.forEach(cat => {
              const catData = val[cat.name]
              if (!catData) return
              const price = Number((cat as any).price) || 0
              const isSleeved = Object.values(catData).some((v: any) => typeof v === 'object' && v !== null)

              if (isSleeved) {
                Object.entries(catData as unknown as Record<string, Record<string, number>>).forEach(([sleeveKey, sleeveData]) => {
                  const sleeveLabel = sleeveKey === 'LS' ? 'Long Sleeve' : sleeveKey === 'SS' ? 'Short Sleeve' : sleeveKey
                  cat.sizes.forEach(size => {
                    const qty = sleeveData[size]
                    if (qty !== undefined && qty !== null && Number(qty) > 0) {
                      sizeRows.push([
                        idx + 1,
                        new Date(r.submitted_at).toLocaleString(),
                        respondentName,
                        f.label,
                        cat.name,
                        sleeveLabel,
                        size,
                        Number(qty),
                        price > 0 ? price : '',
                        price > 0 ? Number(qty) * price : '',
                      ])
                    }
                  })
                })
              } else {
                cat.sizes.forEach(size => {
                  const qty = (catData as unknown as Record<string, number>)[size]
                  if (qty !== undefined && qty !== null && Number(qty) > 0) {
                    sizeRows.push([
                      idx + 1,
                      new Date(r.submitted_at).toLocaleString(),
                      respondentName,
                      f.label,
                      cat.name,
                      '',
                      size,
                      Number(qty),
                      price > 0 ? price : '',
                      price > 0 ? Number(qty) * price : '',
                    ])
                  }
                })
              }
            })
          })
        })

        if (sizeRows.length > 0) {
          csvRows.push([], ['Size Orders'], sizeHeaders, ...sizeRows)
        }
      }

      const escapeCsv = (value: string | number) => {
        const text = String(value ?? '')
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
      }

      const csv = csvRows.map(row => row.map(escapeCsv).join(',')).join('\r\n')
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${form.title.replace(/\s+/g, '_')}_responses.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      addToast(`Exported ${responses.length} responses to CSV`, 'success')
    } catch (error) {
      console.error('Export error:', error)
      addToast('Failed to export responses', 'error')
    }
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10 shadow-xl">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-6 border-b border-white/10 bg-gray-800/50 flex flex-col lg:flex-row justify-between gap-4">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by content..."
            className="block w-full rounded-md bg-white/5 pl-10 pr-3 py-2 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="hidden sm:flex items-center gap-2 rounded-md border border-dashed border-white/25 bg-transparent px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Columns
          </button>
          <button
            onClick={exportToCsv}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4 mr-2 inline -mt-0.5" />
            Export CSV
          </button>
          {responses.length > 0 && (
            <button
              onClick={handleClearResponses}
              disabled={isClearing}
              className="rounded-md bg-red-600/10 border border-red-600/20 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-600/20 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 mr-2 inline animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2 inline -mt-0.5" />
              )}
              Clear responses
            </button>
          )}
        </div>
      </div>

      <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
        <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Clear all responses?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete all {responses.length} responses for this form.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="confirm-delete" className="text-sm font-medium text-gray-200">
                Type <span className="font-bold text-red-400">DELETE</span> to confirm
              </label>
              <input
                id="confirm-delete"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="bg-gray-800 border-white/10 text-white rounded-md p-2 text-sm focus:border-red-500 focus:ring-red-500"
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} className="border-white/10 hover:bg-white/10 hover:text-white bg-transparent text-white">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClear}
              disabled={confirmText !== 'DELETE'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear Responses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-800/50 border-b border-white/10">
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-gray-400 whitespace-nowrap">
                Submitted
              </th>
              {sortedFields.map(field => (
                <th key={field.id} className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-gray-400 min-w-[200px] max-w-[300px]">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{(field.options as any)?.label_dv || field.label || field.type}</span>
                  </div>
                </th>
              ))}
              {sizeTableFields.length > 0 && (
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-gray-400 whitespace-nowrap">
                  Size Order
                </th>
              )}
              <th className="px-6 py-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {responses.length === 0 ? (
              <tr>
                <td colSpan={sortedFields.length + 2} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="text-gray-600 mb-2">
                      <TableIcon className="h-12 w-12 mx-auto" />
                    </div>
                    <div>
                      <p className="font-semibold text-base text-white">No responses yet</p>
                      <p className="text-gray-400 text-sm mt-1">Share your form to start collecting data.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              responses.map((response) => {
                const isExpanded = expandedRows.has(response.id)
                const totalCols = sortedFields.length + (sizeTableFields.length > 0 ? 1 : 0) + 2

                // Build size order summary for the row badge (handles flat + sleeve-nested)
                const sizeSummaryParts: string[] = []
                sizeTableFields.forEach(f => {
                  const ans = response.form_answers.find(a => a.field_id === f.id)
                  const val = ans?.value as Record<string, any> | null | undefined
                  if (!val || typeof val !== 'object') return
                  const cats: { name: string; sizes: string[] }[] = (f.options as any)?.categories || []
                  cats.forEach(cat => {
                    const catData = val[cat.name]
                    if (!catData) return
                    const isSleeved = Object.values(catData).some((v: any) => typeof v === 'object' && v !== null)
                    if (isSleeved) {
                      Object.entries(catData as unknown as Record<string, Record<string, number>>).forEach(([sleeveKey, sleeveData]) => {
                        const entries = cat.sizes
                          .filter(s => Number(sleeveData[s]) > 0)
                          .map(s => `${s}Ã—${sleeveData[s]}`)
                        if (entries.length) sizeSummaryParts.push(`${cat.name} (${sleeveKey}): ${entries.join(', ')}`)
                      })
                    } else {
                      const entries = cat.sizes
                        .filter(s => Number((catData as unknown as Record<string,number>)[s]) > 0)
                        .map(s => `${s}Ã—${(catData as unknown as Record<string,number>)[s]}`)
                      if (entries.length) sizeSummaryParts.push(`${cat.name}: ${entries.join(', ')}`)
                    }
                  })
                })

                return (
                  <Fragment key={response.id}>
                    <tr className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">
                            {new Date(response.submitted_at).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(response.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      {sortedFields.map(field => {
                        const answer = response.form_answers.find(a => a.field_id === field.id)
                        let displayValue = answer?.value || '-'

                        // Handle file uploads
                        if (field.type === 'file' && typeof displayValue === 'object' && displayValue !== null && 'fileName' in displayValue) {
                          const fileData = displayValue as any
                          const previewKey = `preview:${fileData.filePath || fileData.fileUrl || fileData.fileName}`
                          const downloadKey = `download:${fileData.filePath || fileData.fileUrl || fileData.fileName}`
                          return (
                            <td key={field.id} className="px-6 py-4">
                              <div className="flex items-center gap-3 max-w-[280px]">
                                <span className="text-lg">{getFileIcon(fileData.fileName)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="truncate text-sm font-medium text-gray-200">
                                    {fileData.fileName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatFileSize(fileData.fileSize)}
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleFileAction(fileData, 'preview')}
                                    disabled={fileActionKey === previewKey || fileActionKey === downloadKey}
                                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-primary disabled:opacity-50"
                                    title="Preview file"
                                  >
                                    {fileActionKey === previewKey ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleFileAction(fileData, 'download')}
                                    disabled={fileActionKey === previewKey || fileActionKey === downloadKey}
                                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-primary disabled:opacity-50"
                                    title="Download file"
                                  >
                                    {fileActionKey === downloadKey ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Download className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </td>
                          )
                        }

                        // Handle arrays (checkboxes)
                        if (Array.isArray(displayValue)) displayValue = displayValue.join(', ')

                        return (
                          <td key={field.id} className="px-6 py-4">
                            <div className="text-sm text-gray-300 line-clamp-2 max-w-[250px]">
                              {String(displayValue)}
                            </div>
                          </td>
                        )
                      })}

                      {/* Size order summary cell */}
                      {sizeTableFields.length > 0 && (
                        <td className="px-6 py-4">
                          {sizeSummaryParts.length > 0 ? (
                            <button
                              onClick={() => toggleRow(response.id)}
                              className="text-left group/sum"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-primary font-semibold">{sizeSummaryParts.length} categor{sizeSummaryParts.length === 1 ? 'y' : 'ies'}</span>
                                {isExpanded
                                  ? <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-gray-500 group-hover/sum:text-primary transition-colors" />}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-[200px]">
                                {sizeSummaryParts.join(' | ')}
                              </div>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-600">â€”</span>
                          )}
                        </td>
                      )}

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteResponse(response.id)}
                            disabled={deletingResponseId === response.id}
                            className="rounded p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            title="Delete response"
                          >
                            {deletingResponseId === response.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRow(response.id)}
                            className="rounded p-1.5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                            title={isExpanded ? 'Collapse details' : 'Expand details'}
                          >
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail row â€” size_table breakdown */}
                    {isExpanded && sizeTableFields.length > 0 && (
                      <tr key={`${response.id}-detail`} className="bg-gray-900/60">
                        <td colSpan={totalCols} className="px-6 py-5">
                          <div className="space-y-5">
                            {sizeTableFields.map(f => {
                              const ans = response.form_answers.find(a => a.field_id === f.id)
                              const val = ans?.value as Record<string, Record<string, number>> | null | undefined
                              if (!val || typeof val !== 'object') return null

                              const cats: { name: string; sizes: string[]; price?: number }[] = (f.options as any)?.categories || []
                              const hasPricing = cats.some(c => Number((c as any).price) > 0)

                              // Build display rows: handle both flat and sleeve-nested
                              type DetailRow = { key: string; label: string; price: number; sizeQtys: { size: string; qty: number }[]; catQty: number; catAmount: number }
                              const detailRows: DetailRow[] = []
                              let grandQty = 0
                              let grandAmount = 0

                              cats.forEach(cat => {
                                const catData = val[cat.name]
                                if (!catData) return
                                const price = Number((cat as any).price) || 0
                                const isSleeved = Object.values(catData).some((v: any) => typeof v === 'object' && v !== null)

                                if (isSleeved) {
                                  Object.entries(catData as unknown as Record<string, Record<string, number>>).forEach(([sleeveKey, sleeveData]) => {
                                    const sizeQtys = cat.sizes.map(s => ({ size: s, qty: Number(sleeveData[s]) || 0 })).filter(sq => sq.qty > 0)
                                    const catQty = sizeQtys.reduce((s, sq) => s + sq.qty, 0)
                                    if (catQty > 0) {
                                      const sleeveLabel = sleeveKey === 'LS' ? 'Long Sleeve' : sleeveKey === 'SS' ? 'Short Sleeve' : sleeveKey
                                      const catAmount = catQty * price
                                      grandQty += catQty; grandAmount += catAmount
                                      detailRows.push({ key: `${cat.name}-${sleeveKey}`, label: `${cat.name} â€” ${sleeveLabel}`, price, sizeQtys, catQty, catAmount })
                                    }
                                  })
                                } else {
                                  const sizeQtys = cat.sizes.map(s => ({ size: s, qty: Number((catData as unknown as Record<string,number>)[s]) || 0 })).filter(sq => sq.qty > 0)
                                  const catQty = sizeQtys.reduce((s, sq) => s + sq.qty, 0)
                                  if (catQty > 0) {
                                    const catAmount = catQty * price
                                    grandQty += catQty; grandAmount += catAmount
                                    detailRows.push({ key: cat.name, label: cat.name, price, sizeQtys, catQty, catAmount })
                                  }
                                }
                              })

                              if (!detailRows.length) return null

                              return (
                                <div key={f.id}>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">{f.label}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {detailRows.map(row => (
                                      <div key={row.key} className="rounded-lg border border-white/10 overflow-hidden">
                                        {/* Category header */}
                                        <div className="bg-white/10 px-3 py-2 flex items-center justify-between">
                                          <p className="text-xs font-semibold text-gray-200 uppercase tracking-wider">{row.label}</p>
                                          {row.price > 0 && (
                                            <span className="text-xs text-gray-400 tabular-nums">MVR {row.price.toFixed(2)}/pc</span>
                                          )}
                                        </div>
                                        {/* Size rows */}
                                        <div className="divide-y divide-white/5">
                                          {row.sizeQtys.map(({ size, qty }) => (
                                            <div key={size} className="flex items-center justify-between px-3 py-1.5">
                                              <span className="text-sm text-gray-400 font-medium">{size}</span>
                                              <div className="flex items-center gap-3">
                                                {row.price > 0 && (
                                                  <span className="text-xs text-gray-500 tabular-nums">
                                                    MVR {(qty * row.price).toFixed(2)}
                                                  </span>
                                                )}
                                                <span className="text-sm font-bold text-white tabular-nums w-6 text-right">{qty}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        {/* Category footer */}
                                        <div className="bg-white/5 px-3 py-1.5 flex justify-between items-center">
                                          <span className="text-xs text-gray-500">Subtotal</span>
                                          <div className="flex items-center gap-3">
                                            {row.price > 0 && (
                                              <span className="text-xs font-semibold text-gray-300 tabular-nums">
                                                MVR {row.catAmount.toFixed(2)}
                                              </span>
                                            )}
                                            <span className="text-xs font-bold text-primary tabular-nums">{row.catQty} pcs</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {/* Grand total bar */}
                                  {hasPricing && (
                                    <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5">
                                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Amount</span>
                                      <div className="flex items-center gap-4">
                                        <span className="text-xs text-primary font-bold tabular-nums">{grandQty} pcs</span>
                                        <span className="text-base font-bold text-white tabular-nums">MVR {grandAmount.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer / Pagination */}
      <div className="p-4 bg-gray-800/30 border-t border-white/10 flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-gray-400">
        <span>Showing {responses.length} responses</span>
        <div className="flex items-center gap-2">
          <span>Page 1 of 1</span>
        </div>
      </div>
      {dialog}
    </div >
  )
}
