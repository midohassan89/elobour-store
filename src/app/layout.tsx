import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { dictionaries } from "@/locales";
import { directionFor, isLanguage, type Language } from "@/locales/types";
import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
});

async function readLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const saved = cookieStore.get("lang")?.value;
  return isLanguage(saved) ? saved : "ar";
}

export async function generateMetadata(): Promise<Metadata> {
  const language = await readLanguage();
  const dictionary = dictionaries[language];

  return {
    title: dictionary.storeName,
    description: dictionary.checkoutIntro,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const language = await readLanguage();

  return (
    <html
      lang={language}
      dir={directionFor(language)}
      className={`${cairo.className} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-stone-900">
        <LanguageProvider initialLanguage={language}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
