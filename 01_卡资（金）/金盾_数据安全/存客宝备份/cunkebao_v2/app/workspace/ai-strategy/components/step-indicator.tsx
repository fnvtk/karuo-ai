import { CheckIcon } from "lucide-react"

interface Step {
  number: number
  title: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number
        const isCurrent = currentStep === step.number

        return (
          <div key={step.number} className="flex items-center">
            {/* 步骤连接线 */}
            {index > 0 && <div className={`h-1 w-full ${isCompleted ? "bg-blue-500" : "bg-gray-200"}`} />}

            {/* 步骤圆点 */}
            <div className="relative flex items-center justify-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  isCompleted
                    ? "border-blue-500 bg-blue-500"
                    : isCurrent
                      ? "border-blue-500 bg-white"
                      : "border-gray-300 bg-white"
                }`}
              >
                {isCompleted ? (
                  <CheckIcon className="h-5 w-5 text-white" />
                ) : (
                  <span className={`text-sm font-medium ${isCurrent ? "text-blue-500" : "text-gray-500"}`}>
                    {step.number}
                  </span>
                )}
              </div>

              {/* 步骤标题 */}
              <div className="absolute top-10 whitespace-nowrap">
                <p className={`text-sm font-medium ${isCompleted || isCurrent ? "text-blue-500" : "text-gray-500"}`}>
                  {step.title}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
