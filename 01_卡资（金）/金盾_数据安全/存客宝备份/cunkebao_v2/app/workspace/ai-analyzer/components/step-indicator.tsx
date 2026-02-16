import React from "react"

interface Step {
  number: number
  title: string
}

interface StepIndicatorProps {
  currentStep: number
  steps: Step[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isActive = currentStep >= step.number
        const isLast = index === steps.length - 1

        return (
          <React.Fragment key={step.number}>
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {step.number}
              </div>
              <span className={`ml-2 text-sm font-medium ${isActive ? "text-blue-600" : "text-gray-500"}`}>
                {step.title}
              </span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-4 ${currentStep > step.number ? "bg-blue-600" : "bg-gray-200"}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
