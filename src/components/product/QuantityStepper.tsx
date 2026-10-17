"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import { formatQuantity, quantityStep, snapQuantity } from "@/utils/quantity";
import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

type QuantityStepperProps = {
  name: string;
  quantity: number;
  isWeighed: boolean;
  fluid?: boolean;
  onChange: (quantity: number) => void;
};

export default function QuantityStepper({ name, quantity, isWeighed, fluid = false, onChange }: QuantityStepperProps) {
  const { t } = useI18n();
  const step = quantityStep(isWeighed);
  const [draft, setDraft] = useState(formatQuantity(quantity, isWeighed));

  useEffect(() => {
    setDraft(formatQuantity(quantity, isWeighed));
  }, [quantity, isWeighed]);

  function commit(next: number) {
    onChange(snapQuantity(next, isWeighed));
  }

  return (
    <div className={`flex items-center gap-1.5 ${fluid ? "w-full" : ""}`}>
      <div className={`flex items-center gap-1 rounded-full border border-stone-200 p-1 ${fluid ? "min-w-0 flex-1" : ""}`}>
        <button
          type="button"
          aria-label={t("decreaseQuantity", { name })}
          onClick={() => commit(quantity - step)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-700 transition hover:bg-primary-50 hover:text-primary dark:text-gray-200"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          inputMode="decimal"
          min={step}
          step={step}
          value={draft}
          aria-label={t("quantityInput", { name })}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            const parsed = Number(draft);
            if (!Number.isFinite(parsed)) {
              setDraft(formatQuantity(quantity, isWeighed));
              return;
            }

            commit(parsed);
          }}
          className={`h-8 rounded-full bg-transparent text-center text-sm font-bold text-stone-950 outline-none [appearance:textfield] dark:bg-transparent dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            fluid ? "min-w-0 flex-1" : "w-16"
          }`}
        />
        <button
          type="button"
          aria-label={t("increaseQuantity", { name })}
          onClick={() => commit(quantity + step)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-700 transition hover:bg-primary-50 hover:text-primary dark:text-gray-200"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {isWeighed ? <span className="text-sm font-bold text-stone-500 dark:text-gray-400">{t("kilogram")}</span> : null}
    </div>
  );
}
