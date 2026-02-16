"use client"

import { Button } from "@/app/components/ui/button"
import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  primaryAction?: {
    label: string
    icon?: ReactNode
    onClick: () => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }
  secondaryActions?: Array<{
    label: string
    icon?: ReactNode
    onClick: () => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }>
}

export function PageHeader({ title, description, primaryAction, secondaryActions = [] }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>

      {(primaryAction || secondaryActions.length > 0) && (
        <div className="flex items-center gap-2">
          {secondaryActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "outline"}
              onClick={action.onClick}
              className="flex items-center"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}

          {primaryAction && (
            <Button
              variant={primaryAction.variant || "default"}
              onClick={primaryAction.onClick}
              className="flex items-center"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
