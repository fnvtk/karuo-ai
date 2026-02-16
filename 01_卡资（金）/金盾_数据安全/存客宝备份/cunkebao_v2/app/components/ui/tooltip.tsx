"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
  delayDuration?: number
  side?: "top" | "right" | "bottom" | "left"
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ children, content, className, delayDuration = 200, side = "top" }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false)
    const [position, setPosition] = React.useState({ top: 0, left: 0 })
    const tooltipRef = React.useRef<HTMLDivElement>(null)
    const timeoutRef = React.useRef<NodeJS.Timeout>()

    const handleMouseEnter = (e: React.MouseEvent) => {
      timeoutRef.current = setTimeout(() => {
        const rect = (e.target as HTMLElement).getBoundingClientRect()
        const tooltipRect = tooltipRef.current?.getBoundingClientRect()

        if (tooltipRect) {
          let top = 0
          let left = 0

          switch (side) {
            case "top":
              top = rect.top - tooltipRect.height - 8
              left = rect.left + (rect.width - tooltipRect.width) / 2
              break
            case "bottom":
              top = rect.bottom + 8
              left = rect.left + (rect.width - tooltipRect.width) / 2
              break
            case "left":
              top = rect.top + (rect.height - tooltipRect.height) / 2
              left = rect.left - tooltipRect.width - 8
              break
            case "right":
              top = rect.top + (rect.height - tooltipRect.height) / 2
              left = rect.right + 8
              break
          }

          setPosition({ top, left })
          setIsVisible(true)
        }
      }, delayDuration)
    }

    const handleMouseLeave = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsVisible(false)
    }

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [])

    return (
      <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} ref={ref}>
        {children}
        {isVisible && (
          <div
            ref={tooltipRef}
            className={cn(
              "fixed z-50 px-2 py-1 text-xs text-primary-foreground bg-primary rounded-md shadow-sm scale-90 animate-in fade-in-0 zoom-in-95",
              className,
            )}
            style={{
              top: position.top,
              left: position.left,
              transition: "opacity 150ms ease-in-out, transform 150ms ease-in-out",
            }}
          >
            {content}
          </div>
        )}
      </div>
    )
  },
)
Tooltip.displayName = "Tooltip"

// 为了保持 API 兼容性，我们导出相同的组件名称
export const TooltipProvider = ({ children }: { children: React.ReactNode }) => children
export const TooltipTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div ref={ref} {...props} />
))
TooltipTrigger.displayName = "TooltipTrigger"

export const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div ref={ref} {...props} />
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip }
