"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Language } from "@/locales/types";
import { useAuthStore } from "@/store/authStore";
import { ImagePlus, MessageCircle, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  senderRole: string;
  textAr: string;
  textEn: string;
  textZh: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
};

function messageText(message: ChatMessage, language: Language) {
  if (language === "en") return message.textEn || message.textAr;
  if (language === "zh") return message.textZh || message.textAr;
  return message.textAr;
}

function attachmentSrc(url: string) {
  const rewritten = url.replace(
    /https?:\/\/(?:www\.)?(?:erp\.)?elobour\.store/gi,
    "https://erp.echinamart.com",
  );
  if (rewritten.startsWith("http://") || rewritten.startsWith("https://")) return rewritten;
  const base = (process.env.NEXT_PUBLIC_API_URL || "https://erp.echinamart.com").replace(/\/$/, "");
  return `${base}${rewritten.startsWith("/") ? rewritten : `/${rewritten}`}`;
}

export default function LiveChatWidget() {
  const user = useAuthStore((state) => state.user);
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [lightbox, setLightbox] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages, open]);

  function clearPhoto() {
    setPhoto(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  function choosePhoto(file: File | null) {
    if (!file) return;
    setPhoto(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if ((!text && !photo) || sending) return;
    setSending(true);
    try {
      let attachmentUrl = "";
      let attachmentType = "";
      if (photo) {
        const form = new FormData();
        form.set("file", photo);
        const uploaded = await fetch("/api/customer/chat/upload", { method: "POST", body: form });
        const saved = (await uploaded.json()) as { url?: string; attachmentType?: string };
        if (!uploaded.ok || !saved.url) return;
        attachmentUrl = saved.url;
        attachmentType = saved.attachmentType === "IMAGE" ? "IMAGE" : "IMAGE";
      }

      const response = await fetch("/api/customer/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          lang: language,
          attachmentUrl,
          attachmentType,
        }),
      });
      if (response.ok) {
        setDraft("");
        clearPhoto();
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
        <section className="relative mb-3 flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          <header className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <h2 className="text-sm font-extrabold">{t("liveChat")}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="rounded-full p-1 hover:bg-white/15">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div ref={threadRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((message) => {
              const mine = message.senderRole === "CUSTOMER";
              const text = messageText(message, language);
              const image =
                message.attachmentType === "IMAGE" && message.attachmentUrl
                  ? attachmentSrc(message.attachmentUrl)
                  : "";
              return (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm font-semibold leading-6 ${
                    mine
                      ? "ms-auto bg-primary text-white"
                      : "bg-stone-100 text-stone-800 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  {text ? <p>{text}</p> : null}
                  {image ? (
                    <button type="button" onClick={() => setLightbox(image)} className="mt-1 block">
                      <img src={image} alt={t("chatPhoto")} className="max-h-40 rounded-xl object-cover" />
                    </button>
                  ) : message.attachmentUrl ? (
                    <a href={attachmentSrc(message.attachmentUrl)} target="_blank" rel="noreferrer" className="mt-1 block underline">
                      {t("chatPhoto")}
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
          <form onSubmit={(event) => void send(event)} className="border-t border-stone-100 p-3 dark:border-gray-800">
            {previewUrl ? (
              <div className="mb-2 flex items-center gap-2">
                <img src={previewUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
                <button type="button" onClick={clearPhoto} className="text-xs font-extrabold text-stone-500 dark:text-gray-400">
                  {t("chatRemovePhoto")}
                </button>
              </div>
            ) : null}
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                aria-label={t("chatAttach")}
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-700 hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-200"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("chatPlaceholder")}
                className="min-w-0 flex-1 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
              <button
                type="submit"
                disabled={sending || (!draft.trim() && !photo)}
                className="rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-white disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
              >
                {t("chatSend")}
              </button>
            </div>
          </form>
          {lightbox ? (
            <button
              type="button"
              aria-label={t("close")}
              onClick={() => setLightbox("")}
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4"
            >
              <img src={lightbox} alt={t("chatPhoto")} className="max-h-full max-w-full rounded-2xl object-contain" />
            </button>
          ) : null}
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={t("liveChat")}
        className="ms-auto flex h-14 items-center gap-2 rounded-full bg-primary px-4 text-white shadow-2xl ring-4 ring-primary/20 transition hover:bg-primary/90"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="text-sm font-extrabold">{t("liveChat")}</span>
      </button>
    </div>
  );
}
