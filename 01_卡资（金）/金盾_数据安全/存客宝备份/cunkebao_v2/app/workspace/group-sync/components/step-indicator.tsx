import { cn } from "@/lib/utils"

interface StepIndicatorProps {
  currentStep: number
  steps: { id: number; title: string; subtitle: string }[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="relative">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold",
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
                    width="20"
                    height="20"
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
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <div className={cn("text-sm font-medium", currentStep >= step.id ? "text-blue-500" : "text-gray-400")}>
                  步骤 {step.id}
                </div>
                <div className={cn("text-xs", currentStep >= step.id ? "text-blue-500" : "text-gray-400")}>
                  {step.subtitle}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn("h-0.5 w-24 md:w-32 lg:w-40", currentStep > step.id ? "bg-green-500" : "bg-gray-300")}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
