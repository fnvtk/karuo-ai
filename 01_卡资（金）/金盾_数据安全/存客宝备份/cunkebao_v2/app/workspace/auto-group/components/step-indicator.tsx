"use client"

import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"

interface Step {
  number: number
  title: string
}

interface StepIndicatorProps {
  currentStep: number
  steps: Step[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  const isMobile = useMobile()

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex flex-col items-center relative w-full">
            {/* 连接线 */}
            {index > 0 && (
              <div
                className={cn(
                  "absolute h-[2px] w-full top-4 -left-1/2 z-0",
                  index < currentStep ? "bg-blue-500" : "bg-gray-200",
                )}
              />
            )}

            {/* 步骤圆点 */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center z-10 mb-2 transition-all",
                index + 1 < currentStep
                  ? "bg-blue-500 text-white"
                  : index + 1 === currentStep
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-500",
              )}
            >
              {step.number}
            </div>

            {/* 步骤标题 */}
            <div className={cn("text-sm font-medium", index + 1 === currentStep ? "text-blue-500" : "text-gray-500")}>
              {step.title}
            </div>
            {!isMobile && (
              <div className="text-xs text-gray-500 mt-1 hidden md:block">
                {index + 1 === 1 ? "设置群名称和微信号" : index + 1 === 2 ? "选择执行设备" : "设置流量池标签"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
