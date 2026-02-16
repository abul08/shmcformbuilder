'use client'

import { Form, FormField, FormResponse, FormAnswer } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Search, Table as TableIcon, Filter, MoreHorizontal, ChevronRight, FileDown, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { getFileIcon, formatFileSize } from '@/lib/fileUpload'
import { getSignedUrl } from '@/actions/files'
import * as XLSX from 'xlsx'
import { Trash2, Loader2 } from 'lucide-react'
import { clearFormResponses } from '@/actions/responses'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from 'next/navigation'

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
  const { addToast } = useToast()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const router = useRouter()

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

  const sortedFields = [...fields]
    .filter(f => !['section_header', 'text_block', 'image'].includes(f.type))
    .sort((a, b) => a.order_index - b.order_index)

  const exportToExcel = () => {
    try {
      // Filter out non-data fields just like the table view
      const validFields = [...fields]
        .filter(f => !['section_header', 'text_block', 'image', 'layout'].includes(f.type))
        .sort((a, b) => a.order_index - b.order_index)

      // Prepare Headers
      const headers = ['Submitted At', ...validFields.map(f => (f.options as any)?.label_dv || f.label || f.type)]

      // Prepare Data Rows
      const dataRows = responses.map(r => {
        const submittedAt = new Date(r.submitted_at).toLocaleString()
        const rowData = validFields.map(f => {
          const answer = r.form_answers.find(a => a.field_id === f.id)
          let value = answer?.value

          // Handle null/undefined
          if (value === null || value === undefined) {
            return ''
          }

          // Handle file uploads - export file name
          if (f.type === 'file' && typeof value === 'object' && value !== null && 'fileName' in value) {
            return (value as any).fileName || 'Uploaded file'
          }

          // Handle arrays (checkboxes)
          if (Array.isArray(value)) {
            return value.join(', ')
          }

          // Handle objects
          if (typeof value === 'object') {
            return JSON.stringify(value)
          }

          return value
        })

        return [submittedAt, ...rowData]
      })

      // Create Worksheet from Array of Arrays
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])

      // Auto-width columns
      const colWidths = headers.map((header, i) => {
        const maxContentLength = Math.max(
          header.length,
          ...dataRows.map(row => String(row[i] || '').length)
        )
        return { wch: Math.min(maxContentLength + 2, 50) } // Cap width at 50
      })
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, 'Responses')
      XLSX.writeFile(wb, `${form.title.replace(/\s+/g, '_')}_responses.xlsx`)

      addToast(`Exported ${responses.length} responses to Excel`, 'success')
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
            onClick={exportToExcel}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4 mr-2 inline -mt-0.5" />
            Export Excel
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
              responses.map((response) => (
                <tr key={response.id} className="hover:bg-white/5 transition-colors group">
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
                      return (
                        <td key={field.id} className="px-6 py-4">
                          <a
                            href={fileData.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors max-w-[250px] group"
                          >
                            <span className="text-lg">{getFileIcon(fileData.fileName)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="truncate font-medium group-hover:underline">
                                {fileData.fileName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatFileSize(fileData.fileSize)}
                              </div>
                            </div>
                            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
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
                  <td className="px-6 py-4 text-right">
                    <button className="rounded p-1.5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
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
    </div >
  )
}
