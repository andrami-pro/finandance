"use client";

import { Check } from "@phosphor-icons/react";

interface WizardStep {
  label: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number; // 0-indexed
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <div className="relative flex items-center justify-between">
      {/* Connecting line */}
      <div className="absolute left-0 top-1/2 -z-10 h-0.5 w-full -translate-y-1/2 bg-border" />

      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={step.label} className="z-10 flex flex-col items-center gap-2 bg-card px-2">
            {/* Circle */}
            {isCompleted ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <Check size={14} weight="bold" />
              </div>
            ) : isActive ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/20 ring-4 ring-primary/10">
                <span className="text-sm font-bold">{index + 1}</span>
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                <span className="text-sm font-bold">{index + 1}</span>
              </div>
            )}

            {/* Label */}
            <span
              className={`text-[10px] uppercase tracking-wider ${
                isCompleted
                  ? "font-bold text-primary"
                  : isActive
                    ? "font-bold text-foreground"
                    : "font-medium text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
