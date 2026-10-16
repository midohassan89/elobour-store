/**
 * Product photos are served from /uploads on this site.
 * Local ERP URLs such as http://localhost:3001/uploads/... become that path,
 * and non-ASCII characters are percent-encoded exactly once.
 */
export function resolveProductImage(image?: string | null) {
  let cleanPath = image?.trim() ?? "";
  if (!cleanPath) return "";

  if (cleanPath.startsWith("public/")) {
    cleanPath = `/${cleanPath.slice("public/".length)}`;
  }

  if (cleanPath.startsWith("uploads/")) {
    cleanPath = `/${cleanPath}`;
  }

  cleanPath = cleanPath.replace(
    /(https?:\/{2,})|(\/{2,})/gi,
    (match, protocol: string | undefined) => {
      if (protocol) {
        return `${protocol.slice(0, protocol.indexOf(":") + 1)}//`;
      }

      return "/";
    },
  );

  if (/^https?:\/\//i.test(cleanPath)) {
    try {
      const parsed = new URL(cleanPath);
      if (parsed.pathname === "/uploads" || parsed.pathname.startsWith("/uploads/")) {
        cleanPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      // Keep the original string and encode it below.
    }
  }

  try {
    return encodeURI(decodeURI(cleanPath));
  } catch {
    return encodeURI(cleanPath);
  }
}
