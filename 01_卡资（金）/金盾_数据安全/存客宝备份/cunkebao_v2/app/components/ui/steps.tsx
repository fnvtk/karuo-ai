import React from "react"
import { cn } from "@/app/lib/utils"

interface StepsProps {
  currentStep: number
  className?: string
  children: React.ReactNode
}

interface StepProps {
  title: string
  description?: string
}

export function Steps({ currentStep, className, children }: StepsProps) {
  const steps = React.Children.toArray(children)

  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, index) => {
        const isActive = index === currentStep
        const isCompleted = index < currentStep

        return (
          <React.Fragment key={index}>
            <div className="flex items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                  isActive && "bg-blue-500 text-white",
                  isCompleted && "bg-green-500 text-white",
                  !isActive && !isCompleted && "bg-gray-200 text-gray-500",
                )}
              >
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div className="ml-3">{step}</div>
            </div>

            {index < steps.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-4", index < currentStep ? "bg-green-500" : "bg-gray-200")} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export function Step({ title, description }: StepProps) {
  return (
    <div>
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="text-xs text-gray-500">{description}</div>}
    </div>
  )
}
