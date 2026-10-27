import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';

interface StatusStepperProps {
  currentStatus: string;
}

export const StatusStepper: React.FC<StatusStepperProps> = ({ currentStatus }) => {
  const steps = [
    { key: 'DRAFT', label: 'Draft Created' },
    { key: 'SUBMITTED', label: 'Submitted' },
    { key: 'UNDER_REVIEW', label: 'Scrutiny Review' },
    { key: 'VERIFIED', label: 'Officer Verified' },
    { key: 'APPROVED', label: 'AICTE Approved' },
  ];

  const getStepState = (stepKey: string, index: number) => {
    const s = currentStatus.toUpperCase();

    if (s === 'REJECTED' || s === 'DISCREPANT') {
      if (index === 2) return 'error';
    }

    if (s === 'APPROVED' || s === 'MATURED' || s === 'RENEWED' || s === 'RELEASED') {
      return 'completed';
    }

    if (s === 'VERIFIED' && index <= 3) return 'completed';
    if (s === 'UNDER_REVIEW' && index <= 2) return index < 2 ? 'completed' : 'current';
    if (s === 'SUBMITTED' && index <= 1) return index < 1 ? 'completed' : 'current';
    if (s === 'DRAFT' && index === 0) return 'current';

    return index === 0 ? 'completed' : 'upcoming';
  };

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const state = getStepState(step.key, idx);

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center relative">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    state === 'completed'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : state === 'current'
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm'
                      : state === 'error'
                      ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {state === 'completed' ? (
                    <Check className="w-4 h-4" />
                  ) : state === 'error' ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : state === 'current' ? (
                    <Clock className="w-4 h-4 animate-pulse" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium text-center whitespace-nowrap ${
                    state === 'current'
                      ? 'text-blue-700 font-semibold'
                      : state === 'completed'
                      ? 'text-slate-800'
                      : state === 'error'
                      ? 'text-rose-700 font-semibold'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 -mt-5 ${
                    getStepState(steps[idx + 1].key, idx + 1) === 'completed' || state === 'completed'
                      ? 'bg-emerald-500'
                      : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
