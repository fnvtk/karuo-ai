import { cn } from "@/lib/utils"

interface StepIndicatorProps {
  currentStep: number
  steps: { id: number; title: string; subtitle: string }[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="mb-6 overflow-x-auto pb-2">
      <div className="flex min-w-max">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center relative">
              {/* 步骤圆圈 */}
              <div
                className={cn(
                  "flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 text-sm font-semibold",
                  currentStep > step.id
                    ? "border-green-500 bg-green-500 text-white"
                    : currentStep === step.id
                      ? "border-blue-500 bg-white text-blue-500"
                      : "border-gray-300 bg-white text-gray-300",
                )}
              >
                {currentStep > step.id ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  step.id
                )}
              </div>

              {/* 步骤标题和描述 */}
              <div className="mt-2 text-center w-full">
                <div
                  className={cn(
                    "text-xs sm:text-sm font-medium",
                    currentStep >= step.id ? "text-blue-500" : "text-gray-400",
                  )}
                >
                  步骤 {step.id}
                </div>
                <div
                  className={cn(
                    "text-xs whitespace-nowrap",
                    currentStep >= step.id ? "text-blue-500" : "text-gray-400",
                  )}
                >
                  {step.subtitle}
                </div>
              </div>
            </div>

            {/* 连接线 */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 sm:w-16 md:w-24 lg:w-32",
                  currentStep > step.id ? "bg-green-500" : "bg-gray-300",
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
