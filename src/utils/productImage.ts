const ERP_ORIGIN = "https://erp.echinamart.com";
const PLACEHOLDER = "/placeholder.png";

function rewriteLegacyHost(rawUrl: string) {
  return rawUrl.replace(/https?:\/\/(?:www\.)?(?:erp\.)?elobour\.store/gi, ERP_ORIGIN);
}

export function getNormalizedUrl(rawUrl: string | null | undefined) {
  if (!rawUrl || rawUrl === PLACEHOLDER) return PLACEHOLDER;

  const source = rewriteLegacyHost(rawUrl);
  const match = source.match(/(\/uploads\/.*)/);
  if (match) {
    const pathAfterUploads = match[1];

    try {
      const decodedPath = decodeURIComponent(pathAfterUploads);
      const safePath = encodeURI(decodedPath);
      const baseUrl = process.env.NODE_ENV === "production" ? ERP_ORIGIN : "http://localhost:3001";

      return `${baseUrl}${safePath}`;
    } catch {
      return `${ERP_ORIGIN}${pathAfterUploads}`;
    }
  }

  return source;
}

/** Product photos load from the ERP. Empty values stay empty so the card can show its placeholder. */
export function resolveProductImage(image?: string | null) {
  const url = getNormalizedUrl(image);
  return url === PLACEHOLDER ? "" : url;
}
