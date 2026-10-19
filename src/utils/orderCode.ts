/** Readable order label. Old ids stay LTR so "#" does not flip in Arabic. */
export function formatOrderCode(orderNumber: string | null | undefined, id: string) {
  const readable = orderNumber?.trim();
  if (readable) return `#${readable}`;
  const tail = id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  return `#${tail || id.slice(-6).toUpperCase()}`;
}
