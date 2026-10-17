"use client";

import type { Language } from "@/locales/types";
import { ar, enUS, zhCN } from "date-fns/locale";
import { forwardRef, useSyncExternalStore } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./delivery-time-picker.css";

registerLocale("ar", ar);
registerLocale("en", enUS);
registerLocale("zh", zhCN);

const LEAD_MS = 60 * 60 * 1000;

export function nextValidDeliveryTime(from = Date.now()) {
  const earliest = from + LEAD_MS;
  const step = 15 * 60 * 1000;
  return new Date(Math.ceil(earliest / step) * step);
}

export function isDeliveryTimeAllowed(time: Date) {
  return time.getTime() >= Date.now() + LEAD_MS;
}

const inputClassName =
  "w-full cursor-pointer rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-base font-semibold text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-green-600 focus:ring-4 focus:ring-green-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500";

const PickerInput = forwardRef<HTMLInputElement, { value?: string; onClick?: () => void; id?: string }>(
  function PickerInput({ value, onClick, id }, ref) {
    return (
      <input
        id={id}
        ref={ref}
        readOnly
        value={value ?? ""}
        onClick={onClick}
        className={inputClassName}
      />
    );
  },
);

function useNarrowScreen() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia("(max-width: 767px)");
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
}

type DeliveryTimePickerProps = {
  id: string;
  selected: Date;
  onChange: (value: Date) => void;
  locale: Language;
};

export default function DeliveryTimePicker({ id, selected, onChange, locale }: DeliveryTimePickerProps) {
  const narrow = useNarrowScreen();

  return (
    <DatePicker
      id={id}
      selected={selected}
      onChange={(date: Date | null) => {
        if (!date || !isDeliveryTimeAllowed(date)) {
          onChange(nextValidDeliveryTime());
          return;
        }

        onChange(date);
      }}
      showTimeSelect
      timeIntervals={15}
      timeFormat="h:mm aa"
      dateFormat="dd/MM/yyyy h:mm aa"
      minDate={new Date()}
      filterTime={(time) => time.getTime() >= Date.now() + LEAD_MS}
      locale={locale}
      customInput={<PickerInput id={id} />}
      wrapperClassName="block w-full"
      calendarClassName="egychina-datepicker"
      popperClassName="z-[60]"
      popperPlacement={locale === "ar" ? "bottom-end" : "bottom-start"}
      withPortal={narrow}
      shouldCloseOnSelect
    />
  );
}
