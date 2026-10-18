"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Language } from "@/locales/types";
import { useAuthStore } from "@/store/authStore";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  titleAr: string;
  titleEn: string;
  titleZh: string;
  bodyAr: string;
  bodyEn: string;
  bodyZh: string;
  orderId: string | null;
  isRead: boolean;
};

function textFor(item: NotificationItem, language: Language, field: "title" | "body") {
  if (language === "en") {
    return field === "title" ? item.titleEn || item.titleAr : item.bodyEn || item.bodyAr;
  }
  if (language === "zh") {
    return field === "title" ? item.titleZh || item.titleAr : item.bodyZh || item.bodyAr;
  }
  return field === "title" ? item.titleAr : item.bodyAr;
}

export default function NotificationBell() {
  const user = useAuthStore((state) => state.user);
  const { t, language } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((item) => !item.isRead).length;

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    const response = await fetch("/api/customer/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { notifications?: NotificationItem[] };
    setItems(Array.isArray(data.notifications) ? data.notifications : []);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (!user) return null;

  async function openMenu() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    await fetch("/api/customer/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label={t("notifications")}
        aria-expanded={open}
        onClick={() => void openMenu()}
        className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-800 transition hover:border-primary hover:text-primary dark:border-gray-800 dark:text-gray-100"
      >
        <Bell className="h-6 w-6" />
        {unread > 0 ? (
          <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute end-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <p className="border-b border-stone-100 px-4 py-3 text-sm font-extrabold text-stone-900 dark:border-gray-800 dark:text-gray-100">
            {t("notifications")}
          </p>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm font-bold text-stone-500 dark:text-gray-400">
                {t("noNotifications")}
              </li>
            ) : (
              items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (item.orderId) router.push(`/account/orders/${item.orderId}`);
                    }}
                    className="block w-full px-4 py-3 text-start transition hover:bg-stone-50 dark:hover:bg-gray-800"
                  >
                    <span className="block text-sm font-extrabold text-stone-900 dark:text-gray-100">
                      {textFor(item, language, "title")}
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-stone-500 dark:text-gray-400">
                      {textFor(item, language, "body")}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
