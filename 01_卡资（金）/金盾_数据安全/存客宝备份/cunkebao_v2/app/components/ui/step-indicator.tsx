"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export interface Step {
  id: number
  title: string
  subtitle?: string
  description?: string
}

export interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  variant?: "default" | "circle" | "numbered" | "minimal"
  orientation?: "horizontal" | "vertical"
  onStepClick?: (stepId: number) => void
  className?: string
  showProgress?: boolean
}

/**
 * 统一的步骤指示器组件
 *
 * @param steps 步骤数组
 * @param currentStep 当前步骤
 * @param variant 样式变体
 * @param orientation 方向
 * @param onStepClick 步骤点击回调
 * @param className 自定义类名
 * @param showProgress 是否显示进度条
 */
export function StepIndicator({
  steps,
  currentStep,
  variant = "default",
  orientation = "horizontal",
  onStepClick,
  className,
  showProgress = true,
}: StepIndicatorProps) {
  // 计算进度百分比
  const progressPercentage = steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0

  // 根据变体渲染不同样式的步骤指示器
  if (variant === "circle") {
    return (
      <div className={cn("w-full", orientation === "vertical" ? "space-y-4" : "", className)}>
        <div
          className={cn(
            "relative",
            orientation === "horizontal" ? "flex justify-between items-center" : "flex-col space-y-8",
          )}
        >
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id
            const isCurrent = currentStep === step.id
            const isClickable = onStepClick && (isCompleted || isCurrent)

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center relative z-10",
                  orientation === "horizontal" ? "flex-col" : "flex-row space-x-4",
                  isClickable ? "cursor-pointer" : "",
                )}
                onClick={() => isClickable && onStepClick(step.id)}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
                    isCompleted
                      ? "bg-blue-600 text-white"
                      : isCurrent
                        ? "border-2 border-blue-600 text-blue-600"
                        : "border-2 border-gray-300 text-gray-300",
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : step.id}
                </div>

                <div className={cn("text-center mt-2", orientation === "horizontal" ? "" : "flex-1")}>
                  <div
                    className={cn(
                      "font-medium",
                      isCurrent ? "text-blue-600" : isCompleted ? "text-gray-900" : "text-gray-400",
                    )}
                  >
                    {step.title}
                  </div>
                  {step.subtitle && <div className="text-xs text-gray-500">{step.subtitle}</div>}
                </div>
              </div>
            )
          })}

          {/* 连接线 */}
          {showProgress && orientation === "horizontal" && (
            <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0">
              <div
                className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // 默认样式
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const isActive = currentStep >= step.id
          const isCurrent = currentStep === step.id
          const isClickable = onStepClick && currentStep > step.id

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div
                className={cn(
                  "relative flex items-center justify-center w-8 h-8 rounded-full border-2",
                  isActive
                    ? "bg-blue-600 border-blue-600 text-white"
                    : isCurrent
                      ? "border-blue-600 text-blue-600"
                      : "border-gray-300 text-gray-300",
                  isClickable ? "cursor-pointer" : "",
                )}
                onClick={() => isClickable && onStepClick(step.id)}
              >
                {isActive && currentStep !== step.id ? <Check className="w-4 h-4" /> : step.id}
              </div>
              {index < steps.length - 1 && (
                <div className={cn("flex-1 h-0.5", index < currentStep - 1 ? "bg-blue-600" : "bg-gray-300")} />
              )}
              <div
                className={cn(
                  "absolute mt-10 text-xs text-center w-24 -ml-8",
                  isCurrent ? "text-blue-600 font-medium" : "text-gray-500",
                )}
              >
                {step.title}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StepIndicator
