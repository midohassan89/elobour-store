import LiveChatWidget from "@/components/chat/LiveChatWidget";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { dictionaries } from "@/locales";
import { directionFor, isLanguage, type Language } from "@/locales/types";
import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
});

const STORE_ORIGIN = "https://echinamart.com";

async function readLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const saved = cookieStore.get("lang")?.value;
  return isLanguage(saved) ? saved : "ar";
}

export async function generateMetadata(): Promise<Metadata> {
  const language = await readLanguage();
  const dictionary = dictionaries[language];

  return {
    metadataBase: new URL(STORE_ORIGIN),
    title: dictionary.storeName,
    description: dictionary.checkoutIntro,
    alternates: { canonical: STORE_ORIGIN },
    openGraph: {
      title: dictionary.storeName,
      description: dictionary.checkoutIntro,
      url: STORE_ORIGIN,
      siteName: dictionary.storeName,
      locale: language === "zh" ? "zh_CN" : language === "en" ? "en_US" : "ar_EG",
      type: "website",
    },
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
      <body className="flex min-h-full flex-col bg-white text-stone-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <LanguageProvider initialLanguage={language}>
          <WishlistProvider>
            {children}
            <LiveChatWidget />
            <Toaster position="bottom-center" />
          </WishlistProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
