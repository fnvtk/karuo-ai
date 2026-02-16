"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepProps {
  title: string
  description?: string
  status: "pending" | "current" | "completed"
  index: number
  isLast?: boolean
}

export function Step({ title, description, status, index, isLast }: StepProps) {
  return (
    <div className={cn("flex", !isLast && "pb-8")}>
      <div className="flex flex-col items-center mr-4">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium",
            status === "completed" && "bg-blue-600 border-blue-600 text-white",
            status === "current" && "bg-blue-50 border-blue-600 text-blue-600",
            status === "pending" && "bg-gray-50 border-gray-300 text-gray-500",
          )}
        >
          {status === "completed" ? <Check className="w-4 h-4" /> : <span>{index + 1}</span>}
        </div>
        {!isLast && <div className={cn("w-0.5 h-full mt-2", status === "completed" ? "bg-blue-600" : "bg-gray-300")} />}
      </div>
      <div className="flex-1 min-w-0">
        <h3
          className={cn(
            "text-sm font-medium",
            status === "current" && "text-blue-600",
            status === "completed" && "text-gray-900",
            status === "pending" && "text-gray-500",
          )}
        >
          {title}
        </h3>
        {description && (
          <p
            className={cn(
              "mt-1 text-sm",
              status === "current" && "text-blue-500",
              status === "completed" && "text-gray-600",
              status === "pending" && "text-gray-400",
            )}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

interface StepsProps {
  currentStep: number
  children: React.ReactElement<StepProps>[]
  className?: string
}

export function Steps({ currentStep, children, className }: StepsProps) {
  return (
    <nav className={cn("", className)}>
      <ol className="space-y-0">
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return null

          let status: "pending" | "current" | "completed"
          if (index < currentStep) {
            status = "completed"
          } else if (index === currentStep) {
            status = "current"
          } else {
            status = "pending"
          }

          return React.cloneElement(child, {
            ...child.props,
            status,
            index,
            isLast: index === children.length - 1,
          })
        })}
      </ol>
    </nav>
  )
}
