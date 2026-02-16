"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast"

type ToastProps = {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
  action?: ReactNode
}

interface ToastContextValue {
  toast: (props: Omit<ToastProps, "id">) => void
  dismiss: (id: string) => void
  toasts: ToastProps[]
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (context === null) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = (props: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, ...props }])
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  // 自动移除
  useEffect(() => {
    const timer = setTimeout(() => {
      if (toasts.length > 0) {
        setToasts((prev) => prev.slice(1))
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [toasts])

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
      <ToastViewport />
      {toasts.map((props) => (
        <Toast key={props.id} {...props} onDismiss={() => dismiss(props.id)} />
      ))}
    </ToastContext.Provider>
  )
} 