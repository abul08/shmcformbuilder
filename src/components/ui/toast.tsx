'use client'

import * as React from 'react'
import { createContext, useContext, useState } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
  className?: string
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (message: string, type: ToastType, className?: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (message: string, type: ToastType = 'info', className?: string) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type, className }])

    // Auto-remove after 10 seconds
    setTimeout(() => {
      removeToast(id)
    }, 10000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 w-full max-w-sm p-4 sm:p-6 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastNotification({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = {
    success: {
      icon: CheckCircle2,
      ring: 'ring-green-500/20',
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      iconClass: 'text-green-400'
    },
    error: {
      icon: AlertCircle,
      ring: 'ring-red-500/20',
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      iconClass: 'text-red-400'
    },
    warning: {
      icon: AlertTriangle,
      ring: 'ring-yellow-500/20',
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      iconClass: 'text-yellow-400'
    },
    info: {
      icon: Info,
      ring: 'ring-blue-500/20',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      iconClass: 'text-blue-400'
    }
  }

  const { icon: Icon, ring, bg, text, iconClass } = config[toast.type]

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-lg bg-gray-800 p-4 ring-1 ${ring} shadow-lg animate-in slide-in-from-right-full duration-300`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg}`}>
        <Icon className={`h-5 w-5 ${iconClass}`} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${text} ${toast.className || 'font-sans'}`} dir="auto">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
