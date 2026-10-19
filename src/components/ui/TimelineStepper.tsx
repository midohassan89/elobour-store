"use client";

import { XCircle, type LucideIcon } from "lucide-react";

export type TimelineStep = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type TimelineStepperProps = {
  steps: TimelineStep[];
  currentStatus: string;
  isCancelled?: boolean;
};

type StepState = "completed" | "current" | "future" | "cancelled";

export default function TimelineStepper({ steps, currentStatus, isCancelled = false }: TimelineStepperProps) {
  const matched = steps.findIndex((step) => step.id === currentStatus);
  const cancelled = isCancelled || currentStatus === "CANCELLED";
  const currentIndex = matched >= 0 ? matched : 0;

  function stateFor(index: number): StepState {
    if (cancelled && index === currentIndex) return "cancelled";
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "current";
    return "future";
  }

  function connectorClass(index: number) {
    const next = stateFor(index + 1);
    return next === "completed" || next === "current" ? "bg-primary" : "bg-stone-200 dark:bg-gray-700";
  }

  return (
    <ol className="flex flex-col md:flex-row md:items-start">
      {steps.map((step, index) => {
        const state = stateFor(index);
        const Icon = state === "cancelled" ? XCircle : step.icon;
        const isLast = index === steps.length - 1;
        const circleClass =
          state === "cancelled"
            ? "bg-red-600 text-white"
            : state === "future"
              ? "border border-stone-200 bg-stone-100 text-stone-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-500"
              : "bg-primary text-white";
        const labelClass =
          state === "cancelled"
            ? "font-extrabold text-red-700 dark:text-red-300"
            : state === "current"
              ? "font-extrabold text-stone-950 dark:text-gray-100"
              : state === "completed"
                ? "font-bold text-green-800 dark:text-emerald-300"
                : "font-semibold text-stone-400 dark:text-gray-400";

        return (
          <li
            key={step.id}
            className={`relative flex flex-1 gap-3 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center ${
              isLast ? "" : "pb-8"
            }`}
            aria-current={state === "current" || state === "cancelled" ? "step" : undefined}
          >
            <div className="flex w-10 shrink-0 flex-col items-center md:w-full md:flex-row">
              {index > 0 ? (
                <span className={`hidden h-0.5 flex-1 md:block ${connectorClass(index - 1)}`} />
              ) : (
                <span className="hidden flex-1 md:block" />
              )}
              <span
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${circleClass} ${
                  state === "current" ? "animate-pulse ring-4 ring-primary/25" : ""
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              {isLast ? (
                <span className="hidden flex-1 md:block" />
              ) : (
                <span className={`hidden h-0.5 flex-1 md:block ${connectorClass(index)}`} />
              )}
            </div>
            {!isLast ? (
              <span className={`absolute start-5 top-10 bottom-0 w-0.5 md:hidden ${connectorClass(index)}`} />
            ) : null}
            <p className={`text-sm leading-5 md:min-h-10 md:px-1 md:text-xs ${labelClass}`}>{step.label}</p>
          </li>
        );
      })}
    </ol>
  );
}
