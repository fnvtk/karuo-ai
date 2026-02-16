import React from "react";
import { Steps } from "antd-mobile";

interface StepIndicatorProps {
  currentStep: number;
  steps: { id: number; title: string; subtitle: string }[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  steps,
}) => {
  return (
    <div style={{ overflowX: "auto", padding: "30px 0px", background: "#fff" }}>
      <Steps current={currentStep - 1}>
        {steps.map((step, idx) => (
          <Steps.Step
            key={step.id}
            title={step.subtitle}
            icon={
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: idx < currentStep ? "#1677ff" : "#cccccc",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {step.id}
              </div>
            }
          />
        ))}
      </Steps>
    </div>
  );
};

export default StepIndicator;
