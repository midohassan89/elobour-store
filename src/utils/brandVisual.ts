export function brandImageUrl(image?: string) {
  if (!image?.trim()) {
    return "";
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  const path = image.startsWith("/") ? image : `/${image.replace(/^public\//, "")}`;

  if (path.startsWith("/uploads")) {
    return `http://localhost:3001${path}`;
  }

  return path;
}
