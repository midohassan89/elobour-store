"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Language } from "@/locales/types";
import { useAuthStore } from "@/store/authStore";
import { MessageCircle, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ChatMessage = {
  id: string;
  senderRole: string;
  textAr: string;
  textEn: string;
  textZh: string;
};

function messageText(message: ChatMessage, language: Language) {
  if (language === "en") return message.textEn || message.textAr;
  if (language === "zh") return message.textZh || message.textAr;
  return message.textAr;
}

export default function LiveChatWidget() {
  const user = useAuthStore((state) => state.user);
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setMessages([]);
      return;
    }
    const response = await fetch(`/api/customer/chat?lang=${language}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { messages?: ChatMessage[] };
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  }, [language, user]);

  useEffect(() => {
    if (!open) return;
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(timer);
  }, [load, open]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/customer/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: language }),
      });
      if (response.ok) {
        setDraft("");
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  if (!user) return null;

  return (
    <div className="fixed bottom-4 end-4 z-40">
      {open ? (
        <section className="mb-3 flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          <header className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <h2 className="text-sm font-extrabold">{t("liveChat")}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="rounded-full p-1 hover:bg-white/15">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((message) => {
              const mine = message.senderRole === "CUSTOMER";
              return (
                <p
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm font-semibold leading-6 ${
                    mine
                      ? "ms-auto bg-primary text-white"
                      : "bg-stone-100 text-stone-800 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  {messageText(message, language)}
                </p>
              );
            })}
          </div>
          <form onSubmit={(event) => void send(event)} className="flex gap-2 border-t border-stone-100 p-3 dark:border-gray-800">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("chatPlaceholder")}
              className="min-w-0 flex-1 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-white disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            >
              {t("chatSend")}
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={t("liveChat")}
        className="ms-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary/90"
      >
        <MessageCircle className="h-7 w-7" />
      </button>
    </div>
  );
}
