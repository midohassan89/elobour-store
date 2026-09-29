type NamedItem = {
  name: string;
};

/** Normalize Arabic alef variants so near-duplicate brand/category names collapse. */
export function normalizeArabicName(name: string) {
  return name
    .trim()
    .replace(/[إأآٱ]/g, "ا")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function uniqueByArabicName<T extends NamedItem>(items: T[]) {
  return Array.from(
    new Map(items.map((item) => [normalizeArabicName(item.name), item])).values(),
  );
}
