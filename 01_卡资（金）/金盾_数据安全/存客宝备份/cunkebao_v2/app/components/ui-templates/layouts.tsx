"use client"

/**
 * 布局组件模板
 *
 * 包含项目中常用的各种布局组件
 */

import type React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

interface PageHeaderProps {
  title: string
  onBack?: () => void
  actionButton?: React.ReactNode
}

/**
 * 页面头部组件
 * 用于页面顶部的标题和操作区
 */
export function PageHeader({ title, onBack, actionButton }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-medium">{title}</h1>
        </div>
        {actionButton}
      </div>
    </header>
  )
}

interface StepIndicatorProps {
  steps: Array<{
    step: number
    title: string
    icon: React.ReactNode
  }>
  currentStep: number
}

/**
 * 步骤指示器组件
 * 用于多步骤流程的导航
 */
export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {steps.map(({ step, title, icon }) => (
          <div key={step} className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === currentStep
                  ? "bg-blue-600 text-white"
                  : step < currentStep
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {step < currentStep ? "✓" : icon}
            </div>
            <span className="text-xs mt-1">{title}</span>
          </div>
        ))}
      </div>
      <div className="relative mt-2">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200"></div>
        <div
          className="absolute top-0 left-0 h-1 bg-blue-600 transition-all"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        ></div>
      </div>
    </div>
  )
}

interface StepNavigationProps {
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  backLabel?: string
  isLastStep?: boolean
  isNextDisabled?: boolean
}

/**
 * 步骤导航组件
 * 用于多步骤流程的前进后退按钮
 */
export function StepNavigation({
  onBack,
  onNext,
  nextLabel = "下一步",
  backLabel = "上一步",
  isLastStep = false,
  isNextDisabled = false,
}: StepNavigationProps) {
  return (
    <div className="pt-4 flex justify-between">
      <Button variant="outline" onClick={onBack}>
        <ChevronLeft className="mr-2 h-4 w-4" />
        {backLabel}
      </Button>
      <Button onClick={onNext} disabled={isNextDisabled}>
        {isLastStep ? "完成" : nextLabel}
        {!isLastStep && <span className="ml-2">→</span>}
      </Button>
    </div>
  )
}
