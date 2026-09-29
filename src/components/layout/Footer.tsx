"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import Link from "next/link";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto bg-stone-950 text-stone-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <section>
          <h2 className="text-sm font-bold text-white">{t("storeName")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/" className="transition hover:text-white">
                {t("home")}
              </Link>
            </li>
            <li>
              <Link href="/shop" className="transition hover:text-white">
                {t("shop")}
              </Link>
            </li>
            <li>
              <Link href="/#offers" className="transition hover:text-white">
                {t("offers")}
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-bold text-white">{t("contactUs")}</h2>
          <p className="mt-4 text-sm leading-7">{t("contactBody")}</p>
          <a
            href="https://wa.me/201009972972"
            className="mt-3 inline-flex text-sm font-semibold text-primary-300 transition hover:text-primary-200"
          >
            {t("whatsapp")}
          </a>
        </section>

        <section>
          <h2 className="text-sm font-bold text-white">{t("tedaService")}</h2>
          <p className="mt-4 text-sm font-semibold text-white">{t("privateSedan")}</p>
          <p className="mt-2 text-sm leading-7">{t("tedaBody")}</p>
        </section>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} {t("storeName")}
      </div>
    </footer>
  );
}
