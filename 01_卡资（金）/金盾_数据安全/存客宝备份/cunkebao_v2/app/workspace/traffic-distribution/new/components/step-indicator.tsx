"use client"

import type React from "react"

import { cn } from "@/lib/utils"

interface StepIndicatorProps {
  currentStep: number
  steps: {
    id: number
    title: string
    icon: React.ReactNode
  }[]
}

export default function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex justify-between items-center w-full mb-6 px-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex flex-col items-center">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-2",
              currentStep === index ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500",
            )}
          >
            {step.icon}
          </div>
          <span className={cn("text-sm", currentStep === index ? "text-blue-500 font-medium" : "text-gray-500")}>
            {step.title}
          </span>
        </div>
      ))}
    </div>
  )
}
