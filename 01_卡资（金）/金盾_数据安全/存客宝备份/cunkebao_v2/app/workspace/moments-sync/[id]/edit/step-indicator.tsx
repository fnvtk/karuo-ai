interface StepIndicatorProps {
  currentStep: number
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { number: 1, title: "步骤 1", subtitle: "基础设置" },
    { number: 2, title: "步骤 2", subtitle: "设备选择" },
    { number: 3, title: "步骤 3", subtitle: "选择内容库" },
  ]

  return (
    <div className="flex justify-between relative">
      {steps.map((step, index) => (
        <div key={step.number} className="flex flex-col items-center relative z-10">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
              ${currentStep >= step.number ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}
          >
            {step.number}
          </div>
          <div className={`text-xs mt-2 ${currentStep >= step.number ? "text-blue-600" : "text-gray-400"}`}>
            {step.title}
          </div>
          <div className={`text-xs ${currentStep >= step.number ? "text-gray-600" : "text-gray-400"}`}>
            {step.subtitle}
          </div>
        </div>
      ))}
      <div className="absolute top-4 left-0 right-0 h-[1px] bg-gray-200 -z-10">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
