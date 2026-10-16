const UPLOAD_ORIGINS = [
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "https://erp.elobour.store",
  "https://elobour.store",
];

function isPlaceholder(value: string) {
  return value === "/placeholder.png" || value === "placeholder.png";
}

/**
 * Storefront product photos are always a relative /uploads path.
 * Localhost and production host prefixes are removed, and non-ASCII
 * characters are percent-encoded exactly once.
 */
export function resolveProductImage(image?: string | null) {
  const raw = image?.trim() ?? "";
  if (!raw || isPlaceholder(raw)) return "";

  let cleanPath = raw;
  const lower = cleanPath.toLowerCase();

  for (const origin of UPLOAD_ORIGINS) {
    if (!lower.startsWith(origin)) continue;
    const rest = cleanPath.slice(origin.length);
    if (rest === "/uploads" || rest.startsWith("/uploads/") || rest.startsWith("/uploads?")) {
      cleanPath = rest;
      break;
    }
  }

  if (cleanPath.startsWith("uploads/")) {
    cleanPath = `/${cleanPath}`;
  }

  if (isPlaceholder(cleanPath)) return "";

  try {
    return encodeURI(decodeURI(cleanPath));
  } catch {
    try {
      return encodeURI(cleanPath);
    } catch {
      return "";
    }
  }
}
