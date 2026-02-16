"use client"

import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success"
  onDismiss?: () => void
  title?: string
  description?: string
  action?: React.ReactNode
}

export const ToastProvider = React.Fragment

export function Toast({
  className,
  variant = "default",
  onDismiss,
  title,
  description,
  action,
  ...props
}: ToastProps) {
  const variantStyles = {
    default: "bg-background text-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    success: "bg-green-500 text-white"
  }

  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-1">
        {title && <p className="font-medium">{title}</p>}
        {description && <p className="text-sm opacity-90">{description}</p>}
      </div>
      {action}
      <button
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastViewport() {
  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"></div>
  )
}
