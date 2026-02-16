"use client"

import { Check } from "lucide-react"

interface StepProps {
  currentStep: number
}

export function StepIndicator({ currentStep }: StepProps) {
  const steps = [
    { title: "基础设置", description: "设置点赞规则" },
    { title: "设备选择", description: "选择执行设备" },
    { title: "人群选择", description: "选择目标人群" },
  ]

  return (
    <div className="px-6">
      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center relative z-10">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  index < currentStep
                    ? "bg-blue-600 text-white"
                    : index === currentStep
                      ? "border-2 border-blue-600 text-blue-600"
                      : "border-2 border-gray-300 text-gray-300"
                }`}
              >
                {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
              </div>
              <div className="text-center mt-2">
                <div className={`text-sm font-medium ${index <= currentStep ? "text-gray-900" : "text-gray-400"}`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500 mt-1">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0">
          <div
            className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}
