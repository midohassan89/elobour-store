"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Language } from "@/locales/types";
import { formatEstimatedTime } from "@/utils/estimatedTime";
import { FormEvent, useEffect, useId, useRef, useState } from "react";

export type AddressZone = {
  id: string;
  nameAr: string;
  nameEn: string;
  nameZh: string;
  deliveryFee: number;
  estimatedTime?: string | null;
};

export type AddressFormValues = {
  title: string;
  recipientName: string;
  street: string;
  phoneNumber: string;
  city: string;
  zoneId: string;
};

export type AddressFormData = {
  title?: string;
  recipientName?: string | null;
  street?: string;
  phoneNumber?: string | null;
  city?: string | null;
  zoneId?: string | null;
};

const DEFAULT_CITY = "العين السخنة";

const inputClassName =
  "w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-4 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500";

const labelClassName = "mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300";

function zoneLabel(zone: Partial<AddressZone> | null | undefined, language: Language) {
  const nameEn = zone?.nameEn?.trim() ?? "";
  const nameZh = zone?.nameZh?.trim() ?? "";
  const nameAr = zone?.nameAr?.trim() ?? "";

  if (language === "en" && nameEn) {
    return nameEn;
  }

  if (language === "zh" && nameZh) {
    return nameZh;
  }

  return nameAr;
}

type AddressFormProps = {
  initialData?: AddressFormData | null;
  zones?: AddressZone[];
  zonesUnavailable?: boolean;
  pending?: boolean;
  error?: string | null;
  title?: string;
  onSubmit: (values: AddressFormValues) => void;
  onCancel?: () => void;
  onChange?: (values: AddressFormValues) => void;
};

export default function AddressForm({
  initialData,
  zones,
  zonesUnavailable = false,
  pending = false,
  error,
  title,
  onSubmit,
  onCancel,
  onChange,
}: AddressFormProps) {
  const { t, language } = useI18n();
  const formId = useId();
  const onChangeRef = useRef(onChange);
  const [titleChoice, setTitleChoice] = useState<"home" | "work" | "other">("home");
  const [customTitle, setCustomTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [street, setStreet] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [internalZones, setInternalZones] = useState<AddressZone[]>([]);
  const [internalUnavailable, setInternalUnavailable] = useState(false);
  const zoneOptions = zones ?? internalZones;
  const homeLabel = t("addressTitleHome");
  const workLabel = t("addressTitleWork");
  const resolvedTitle = titleChoice === "other" ? customTitle.trim() : titleChoice === "work" ? workLabel : homeLabel;
  const city = initialData?.city?.trim() || DEFAULT_CITY;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const nextTitle = initialData?.title?.trim() ?? "";

    if (!nextTitle || nextTitle === homeLabel) {
      setTitleChoice("home");
      setCustomTitle("");
    } else if (nextTitle === workLabel) {
      setTitleChoice("work");
      setCustomTitle("");
    } else {
      setTitleChoice("other");
      setCustomTitle(nextTitle);
    }

    setRecipientName(initialData?.recipientName?.trim() ?? "");
    setStreet(initialData?.street?.trim() ?? "");
    setPhoneNumber(initialData?.phoneNumber?.trim() ?? "");
    setZoneId(initialData?.zoneId?.trim() ?? "");
  }, [initialData, homeLabel, workLabel]);

  useEffect(() => {
    if (zones) {
      return;
    }

    const controller = new AbortController();

    fetch("/api/delivery-zones", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("failed");
        }

        const payload = (await response.json()) as { zones?: AddressZone[] };
        const nextZones = Array.isArray(payload.zones) ? payload.zones : [];
        setInternalZones(nextZones);
        setInternalUnavailable(nextZones.length === 0);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }

        setInternalUnavailable(true);
      });

    return () => controller.abort();
  }, [zones]);

  useEffect(() => {
    if (zoneOptions.length === 0) {
      return;
    }

    setZoneId((current) => {
      if (current && zoneOptions.some((zone) => zone.id === current)) {
        return current;
      }

      return zoneOptions[0]?.id ?? "";
    });
  }, [zoneOptions]);

  useEffect(() => {
    onChangeRef.current?.({
      title: resolvedTitle,
      recipientName,
      street,
      phoneNumber,
      city,
      zoneId,
    });
  }, [resolvedTitle, recipientName, street, phoneNumber, city, zoneId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      title: resolvedTitle,
      recipientName: recipientName.trim(),
      street: street.trim(),
      phoneNumber: phoneNumber.trim(),
      city,
      zoneId,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-3xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      {title ? <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100">{title}</h2> : null}
      <div>
        <label htmlFor={`${formId}-title`} className={labelClassName}>
          {t("addressTitleLabel")}
        </label>
        <select
          id={`${formId}-title`}
          value={titleChoice}
          onChange={(event) => setTitleChoice(event.target.value as "home" | "work" | "other")}
          className={inputClassName}
        >
          <option value="home">{t("addressTitleHome")}</option>
          <option value="work">{t("addressTitleWork")}</option>
          <option value="other">{t("addressTitleOther")}</option>
        </select>
        {titleChoice === "other" ? (
          <input
            id={`${formId}-title-custom`}
            value={customTitle}
            onChange={(event) => setCustomTitle(event.target.value)}
            placeholder={t("addressTitleCustom")}
            className={`${inputClassName} mt-3`}
            required
          />
        ) : null}
      </div>

      <div>
        <label htmlFor={`${formId}-recipient`} className={labelClassName}>
          {t("recipientName")}
          <span className="text-primary"> *</span>
        </label>
        <input
          id={`${formId}-recipient`}
          name="recipientName"
          type="text"
          required
          autoComplete="name"
          value={recipientName}
          onChange={(event) => setRecipientName(event.target.value)}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-street`} className={labelClassName}>
          {t("addressDetails")}
        </label>
        <input
          id={`${formId}-street`}
          type="text"
          required
          value={street}
          onChange={(event) => setStreet(event.target.value)}
          placeholder={t("addressPlaceholder")}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-phone`} className={labelClassName}>
          {t("phone")}
          <span className="text-primary"> *</span>
        </label>
        <input
          id={`${formId}-phone`}
          name="phoneNumber"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          placeholder={t("phonePlaceholder")}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-zone`} className={labelClassName}>
          {t("deliveryArea")}
        </label>
        <select
          id={`${formId}-zone`}
          required
          value={zoneId}
          onChange={(event) => setZoneId(event.target.value)}
          className={inputClassName}
        >
          {zoneOptions.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zoneLabel(zone, language)}
              {zone.estimatedTime ? ` · ${formatEstimatedTime(zone.estimatedTime, language)}` : ""}
            </option>
          ))}
        </select>
        {zonesUnavailable || (!zones && internalUnavailable) ? (
          <p className="mt-2 text-sm font-bold text-red-600">{t("zonesUnavailable")}</p>
        ) : null}
      </div>

      {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-6 py-3.5 text-base font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
        >
          {pending ? t("savingAddress") : t("saveAddress")}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-stone-300 bg-transparent px-6 py-3.5 text-base font-bold text-stone-500 transition hover:border-stone-400 hover:bg-stone-100 hover:text-stone-800 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            {t("cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
