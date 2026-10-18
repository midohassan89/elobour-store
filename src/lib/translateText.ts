export type LangCode = "ar" | "en" | "zh";

function googleLang(lang: LangCode) {
  return lang === "zh" ? "zh-CN" : lang;
}

async function translateTo(text: string, from: LangCode, to: LangCode) {
  if (from === to) return text;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${googleLang(from)}&tl=${googleLang(to)}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) return text;
  const data = (await response.json()) as unknown;
  const parts = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
  const translated = parts
    .map((part) => (Array.isArray(part) ? String(part[0] ?? "") : ""))
    .join("")
    .trim();
  return translated || text;
}

export async function translateTrio(text: string, source: LangCode) {
  const original = text.trim();
  if (!original) return { textAr: "", textEn: "", textZh: "" };

  try {
    const [textAr, textEn, textZh] = await Promise.all([
      translateTo(original, source, "ar"),
      translateTo(original, source, "en"),
      translateTo(original, source, "zh"),
    ]);
    return { textAr, textEn, textZh };
  } catch (error) {
    console.error("[translateTrio]", error);
    return { textAr: original, textEn: original, textZh: original };
  }
}

export function langFrom(value: unknown): LangCode {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw.startsWith("en")) return "en";
  if (raw.startsWith("zh")) return "zh";
  return "ar";
}
