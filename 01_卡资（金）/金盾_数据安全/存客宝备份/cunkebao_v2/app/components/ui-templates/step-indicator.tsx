"use client"

import { cn } from "@/app/lib/utils"

interface StepIndicatorProps {
  steps: { id: number; title: string; subtitle?: string }[]
  currentStep: number
  className?: string
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between items-center mb-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn("flex flex-col items-center", currentStep === step.id ? "text-blue-600" : "text-gray-400")}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium mb-1",
                currentStep === step.id
                  ? "bg-blue-600 text-white"
                  : currentStep > step.id
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-200 text-gray-500",
              )}
            >
              {step.id}
            </div>
            <div className="text-xs">{step.title}</div>
            {step.subtitle && <div className="text-xs font-medium">{step.subtitle}</div>}
          </div>
        ))}
      </div>

      <div className="relative h-1 bg-gray-200 mt-2">
        <div
          className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
