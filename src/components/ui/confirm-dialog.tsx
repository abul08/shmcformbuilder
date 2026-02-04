'use client'

import * as React from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmDialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  const variantConfig = {
    danger: {
      iconBg: 'bg-red-500/10',
      iconRing: 'ring-red-500/20',
      iconColor: 'text-red-400',
      buttonBg: 'bg-red-500',
      buttonHover: 'hover:bg-red-600'
    },
    warning: {
      iconBg: 'bg-yellow-500/10',
      iconRing: 'ring-yellow-500/20',
      iconColor: 'text-yellow-400',
      buttonBg: 'bg-yellow-500',
      buttonHover: 'hover:bg-yellow-600'
    },
    info: {
      iconBg: 'bg-blue-500/10',
      iconRing: 'ring-blue-500/20',
      iconColor: 'text-blue-400',
      buttonBg: 'bg-blue-500',
      buttonHover: 'hover:bg-blue-600'
    }
  }

  const config = variantConfig[variant]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-gray-800 shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.iconBg} ring-1 ${config.iconRing}`}>
                <AlertTriangle className={`h-6 w-6 ${config.iconColor}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  {description}
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onCancel()
              }}
              className={`rounded-md ${config.buttonBg} ${config.buttonHover} px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// Hook for easier usage
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [config, setConfig] = React.useState<Omit<ConfirmDialogProps, 'open' | 'onConfirm' | 'onCancel'>>({
    title: '',
    description: '',
  })
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null)

  const confirm = React.useCallback((options: Omit<ConfirmDialogProps, 'open' | 'onConfirm' | 'onCancel'>) => {
    setConfig(options)
    setIsOpen(true)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleConfirm = React.useCallback(() => {
    resolveRef.current?.(true)
    setIsOpen(false)
  }, [])

  const handleCancel = React.useCallback(() => {
    resolveRef.current?.(false)
    setIsOpen(false)
  }, [])

  const dialog = (
    <ConfirmDialog
      open={isOpen}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      {...config}
    />
  )

  return { confirm, dialog }
}
