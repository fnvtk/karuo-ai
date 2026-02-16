"use client"

import type React from "react"

import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"
import { Skeleton } from "@/app/components/ui/skeleton"

interface CardAction {
  label: string
  onClick: (e?: React.MouseEvent) => void
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  icon?: ReactNode
}

interface CardItem {
  id: string
  title: string
  description?: string
  image?: string
  tags?: string[]
  status?: {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline" | "success"
  }
  metadata?: Array<{
    label: string
    value: string | number
    icon?: ReactNode
  }>
  onClick?: () => void
  actions?: CardAction[]
}

interface CardGridProps {
  items: CardItem[]
  loading?: boolean
  columns?: 1 | 2 | 3 | 4
  emptyText?: string
  emptyAction?: {
    label: string
    onClick: () => void
  }
}

export function CardGrid({ items, loading = false, columns = 3, emptyText = "暂无数据", emptyAction }: CardGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }

  if (loading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-6`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{emptyText}</p>
        {emptyAction && <Button onClick={emptyAction.onClick}>{emptyAction.label}</Button>}
      </div>
    )
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-6`}>
      {items.map((item) => (
        <Card
          key={item.id}
          className={`overflow-hidden transition-all hover:shadow-md ${item.onClick ? "cursor-pointer" : ""}`}
          onClick={item.onClick}
        >
          {item.image && (
            <div className="aspect-video overflow-hidden">
              <img src={item.image || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
            </div>
          )}

          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                {item.description && <CardDescription>{item.description}</CardDescription>}
              </div>
              {item.status && <Badge variant={item.status.variant as any}>{item.status.label}</Badge>}
            </div>

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {item.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-0">
            {item.metadata && item.metadata.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {item.metadata.map((meta, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {meta.icon}
                    <span className="text-muted-foreground">{meta.label}:</span>
                    <span className="font-medium">{meta.value}</span>
                  </div>
                ))}
              </div>
            )}

            {item.actions && item.actions.length > 0 && (
              <div className="flex gap-2 pt-2">
                {item.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || "outline"}
                    size="sm"
                    onClick={action.onClick}
                    className="flex items-center gap-1"
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
