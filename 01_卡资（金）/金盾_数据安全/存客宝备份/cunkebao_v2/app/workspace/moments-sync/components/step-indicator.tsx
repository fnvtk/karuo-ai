"use client"

interface Step {
  id: number
  title: string
  subtitle: string
}

interface StepIndicatorProps {
  currentStep: number
  steps?: Step[]
}

export function StepIndicator({
  currentStep,
  steps = [
    { id: 1, title: "步骤 1", subtitle: "基础设置" },
    { id: 2, title: "步骤 2", subtitle: "设备选择" },
    { id: 3, title: "步骤 3", subtitle: "选择内容库" },
  ],
}: StepIndicatorProps) {
  return (
    <div className="relative flex justify-between px-6">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`flex flex-col items-center relative z-10 transition-colors ${
            currentStep >= step.id ? "text-blue-600" : "text-gray-400"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              currentStep >= step.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-400"
            }`}
          >
            {step.id}
          </div>
          <div className="text-xs mt-2 font-medium">{step.subtitle}</div>
        </div>
      ))}
      <div className="absolute top-4 left-0 right-0 h-[1px] bg-gray-100 -z-10">
        <div
          className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
