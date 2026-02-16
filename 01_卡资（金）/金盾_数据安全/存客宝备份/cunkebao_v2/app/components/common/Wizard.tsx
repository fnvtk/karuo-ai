"use client"

import { useState, type ReactNode, createContext, useContext } from "react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent } from "@/app/components/ui/card"
import { Progress } from "@/app/components/ui/progress"
import { CheckCircle, Circle, ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/app/lib/utils"

export interface WizardStep {
  id: string
  title: string
  description?: string
  content: ReactNode
  optional?: boolean
  validation?: () => boolean | Promise<boolean>
}

interface WizardContextType {
  currentStep: number
  steps: WizardStep[]
  goToStep: (step: number) => void
  nextStep: () => Promise<void>
  previousStep: () => void
  isFirstStep: boolean
  isLastStep: boolean
  canGoNext: boolean
  canGoPrevious: boolean
}

const WizardContext = createContext<WizardContextType | undefined>(undefined)

export function useWizard() {
  const context = useContext(WizardContext)
  if (!context) {
    throw new Error("useWizard must be used within a Wizard component")
  }
  return context
}

export interface WizardProps {
  steps: WizardStep[]
  onComplete?: () => void
  onCancel?: () => void
  className?: string
  showProgress?: boolean
  showStepNumbers?: boolean
  allowStepNavigation?: boolean
  children?: ReactNode
}

/**
 * 统一的向导组件
 * 支持步骤导航、验证、进度显示等功能
 */
export function Wizard({
  steps,
  onComplete,
  onCancel,
  className,
  showProgress = true,
  showStepNumbers = true,
  allowStepNavigation = false,
  children,
}: WizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  const canGoPrevious = !isFirstStep
  const canGoNext = currentStep < steps.length - 1

  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      if (allowStepNavigation || step <= Math.max(...Array.from(completedSteps)) + 1) {
        setCurrentStep(step)
      }
    }
  }

  const nextStep = async () => {
    const step = steps[currentStep]

    // 验证当前步骤
    if (step.validation) {
      const isValid = await step.validation()
      if (!isValid) {
        return
      }
    }

    // 标记当前步骤为已完成
    setCompletedSteps((prev) => new Set([...prev, currentStep]))

    if (isLastStep) {
      // 完成向导
      if (onComplete) {
        onComplete()
      }
    } else {
      // 进入下一步
      setCurrentStep((prev) => prev + 1)
    }
  }

  const previousStep = () => {
    if (canGoPrevious) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const contextValue: WizardContextType = {
    currentStep,
    steps,
    goToStep,
    nextStep,
    previousStep,
    isFirstStep,
    isLastStep,
    canGoNext,
    canGoPrevious,
  }

  const progressPercentage = ((currentStep + 1) / steps.length) * 100

  return (
    <WizardContext.Provider value={contextValue}>
      <div className={cn("space-y-6", className)}>
        {/* 进度条 */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                步骤 {currentStep + 1} / {steps.length}
              </span>
              <span>{Math.round(progressPercentage)}% 完成</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* 步骤指示器 */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                  index === currentStep
                    ? "border-blue-500 bg-blue-500 text-white"
                    : completedSteps.has(index)
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-gray-300 bg-white text-gray-500",
                  allowStepNavigation && "cursor-pointer hover:border-blue-400",
                )}
                onClick={() => allowStepNavigation && goToStep(index)}
              >
                {completedSteps.has(index) ? (
                  <CheckCircle className="h-6 w-6" />
                ) : showStepNumbers ? (
                  index + 1
                ) : (
                  <Circle className="h-6 w-6" />
                )}
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4 transition-colors",
                    completedSteps.has(index) ? "bg-green-500" : "bg-gray-200",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* 当前步骤标题 */}
        <div className="text-center">
          <h2 className="text-2xl font-bold">{steps[currentStep].title}</h2>
          {steps[currentStep].description && <p className="text-gray-600 mt-2">{steps[currentStep].description}</p>}
          {steps[currentStep].optional && <span className="text-sm text-gray-500 mt-1 block">(可选步骤)</span>}
        </div>

        {/* 步骤内容 */}
        <Card>
          <CardContent className="p-6">{steps[currentStep].content}</CardContent>
        </Card>

        {/* 导航按钮 */}
        <div className="flex justify-between">
          <div className="flex space-x-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
            {canGoPrevious && (
              <Button variant="outline" onClick={previousStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                上一步
              </Button>
            )}
          </div>

          <Button onClick={nextStep} disabled={!canGoNext && !isLastStep}>
            {isLastStep ? "完成" : "下一步"}
            {!isLastStep && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>

        {/* 自定义内容 */}
        {children}
      </div>
    </WizardContext.Provider>
  )
}

// 向导步骤组件
export function WizardStep({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}

// 向导导航组件
export function WizardNavigation() {
  const { currentStep, steps, goToStep, canGoPrevious, canGoNext, nextStep, previousStep } = useWizard()

  return (
    <div className="flex justify-between">
      <Button variant="outline" onClick={previousStep} disabled={!canGoPrevious}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        上一步
      </Button>

      <Button onClick={nextStep} disabled={!canGoNext}>
        下一步
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  )
}
