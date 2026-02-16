"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: Record<string, { label: string; color: string }>
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, config, children, ...props }, ref) => {
    const colorVars = Object.entries(config).reduce((acc, [key, value], index) => {
      acc[`--color-${key}`] = value.color
      return acc
    }, {})

    return (
      <div ref={ref} className={cn("relative", className)} style={colorVars} {...props}>
        {children}
      </div>
    )
  },
)
ChartContainer.displayName = "ChartContainer"

interface ChartTooltipProps {
  children?: React.ReactNode
}

const ChartTooltip = React.forwardRef<HTMLDivElement, ChartTooltipProps>(({ className, children, ...props }, ref) => {
  return <div ref={ref} className={cn("rounded-md border bg-card p-2 shadow-md", className)} {...props} />
})
ChartTooltip.displayName = "ChartTooltip"

interface ChartTooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  payload?: any[]
  label?: string
  labelFormatter?: (value: any) => string
  hideLabel?: boolean
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  ({ active, payload, label, labelFormatter, hideLabel, className, ...props }, ref) => {
    if (!active || !payload) {
      return null
    }

    return (
      <div ref={ref} className={cn("rounded-lg border bg-background p-2 shadow-sm", className)} {...props}>
        {!hideLabel && label && (
          <div className="mb-1 text-xs font-medium">{labelFormatter ? labelFormatter(label) : label}</div>
        )}
        <div className="flex flex-col gap-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-medium">{entry.name}:</span>
              <span>{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
)
ChartTooltipContent.displayName = "ChartTooltipContent"

export { ChartContainer, ChartTooltip, ChartTooltipContent }
