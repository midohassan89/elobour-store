"use client";

import LoginModal from "@/components/auth/LoginModal";
import { useI18n } from "@/components/i18n/LanguageProvider";
import TimelineStepper, { type TimelineStep } from "@/components/ui/TimelineStepper";
import type { AccountReturnRequest } from "@/lib/accountData";
import { useAuthStore } from "@/store/authStore";
import { ClipboardCheck, FileClock, PackageCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function returnTimeline(status: string) {
  const currentStatus = status.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return { currentStatus, isCancelled: currentStatus === "CANCELLED" };
}

export default function ReturnDetails() {
  const params = useParams<{ id: string }>();
  const returnId = typeof params.id === "string" ? params.id : "";
  const { t, language } = useI18n();
  const user = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.ready);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [loginOpen, setLoginOpen] = useState(false);
  const [request, setRequest] = useState<AccountReturnRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const locale = language === "zh" ? "zh-CN" : language === "en" ? "en" : "ar-EG";
  const returnSteps: TimelineStep[] = [
    { id: "PENDING", label: t("returnStatusPending"), icon: FileClock },
    { id: "CONFIRMED", label: t("returnStatusConfirmed"), icon: ClipboardCheck },
    { id: "COLLECTING", label: t("returnStatusCollecting"), icon: Truck },
    { id: "COMPLETED", label: t("returnStatusCompleted"), icon: PackageCheck },
  ];

  useEffect(() => {
    if (!authReady) {
      void hydrate();
    }
  }, [authReady, hydrate]);

  useEffect(() => {
    if (!user || !returnId) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    setMissing(false);

    fetch(`/api/account/returns/${returnId}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) {
          setMissing(true);
          setRequest(null);
          return;
        }

        if (!response.ok) {
          throw new Error("failed");
        }

        const payload = (await response.json()) as { returnRequest?: AccountReturnRequest };
        setRequest(payload.returnRequest ?? null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [user, returnId]);

  if (!authReady || (user && loading)) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 text-center text-sm font-bold text-stone-500 sm:px-6 dark:text-gray-400">
        {t("loadingAccount")}
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-2xl font-extrabold text-stone-950">{t("profileLoginTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-gray-400">{t("profileLoginBody")}</p>
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="mt-6 rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-white transition hover:bg-primary-500"
          >
            {t("login")}
          </button>
        </div>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </section>
    );
  }

  const created = request?.createdAt ? new Date(request.createdAt) : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/profile?tab=returns" className="text-sm font-extrabold text-primary hover:text-primary-500">
        {t("backToReturns")}
      </Link>

      {loadError ? <p className="mt-6 text-sm font-bold text-red-600">{t("accountLoadFailed")}</p> : null}
      {missing ? <p className="mt-6 text-sm font-bold text-stone-500 dark:text-gray-400">{t("returnNotFound")}</p> : null}

      {request ? (
        <article className="mt-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6 dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-2xl font-extrabold text-stone-950">#{request.orderId.slice(-6)}</h1>
          {created && !Number.isNaN(created.getTime()) ? (
            <p className="mt-1 text-xs font-semibold text-stone-500 dark:text-gray-400">
              {created.toLocaleString(locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          ) : null}
          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-gray-800 dark:bg-gray-900">
            <TimelineStepper steps={returnSteps} {...returnTimeline(request.status)} />
          </div>
          <ul className="mt-4 space-y-2 text-sm text-stone-700 dark:text-gray-200">
            {request.items.map((item) => (
              <li key={item.id}>
                {item.productName} × {item.quantity}
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </section>
  );
}
