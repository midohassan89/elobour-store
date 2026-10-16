import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const mimeTypes: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function decodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function resolveUploadFile(slug: string[]) {
  const decodedSlug = slug.map(decodeSegment);

  if (decodedSlug.some((segment) => segment.includes(".."))) {
    return null;
  }

  const candidates = [
    path.join(process.cwd(), "public", "uploads", ...decodedSlug),
    path.resolve(process.cwd(), "..", "egychina-erp", "public", "uploads", ...decodedSlug),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const filePath = resolveUploadFile(slug ?? []);

  if (!filePath) {
    return new NextResponse(null, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
