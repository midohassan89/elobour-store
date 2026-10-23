"use client";

import type { ReactNode } from "react";

export default function LegalArticle({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold text-stone-900 dark:text-gray-100">{title}</h1>
      <div className="mt-6 space-y-6 text-sm leading-7 text-stone-700 dark:text-gray-300">{children}</div>
    </article>
  );
}
