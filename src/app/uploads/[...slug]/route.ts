import fs from "fs";
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

function contentTypeFor(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  const extension = dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
  return mimeTypes[extension] ?? "application/octet-stream";
}

function readUploadFile(decodedSlug: string[]) {
  const erpUploads =
    process.env.ERP_UPLOADS_DIR ||
    ["", "var", "www", "egychina-erp", "public", "uploads"].join("/");
  const filePath = [erpUploads.replace(/\/+$/, ""), ...decodedSlug].join("/");

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return fs.readFileSync(filePath);
    }
  } catch {
    return null;
  }

  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const segments = slug ?? [];
  const decodedSlug = segments.map(decodeSegment);

  if (decodedSlug.length === 0 || decodedSlug.some((segment) => segment.includes(".."))) {
    return new NextResponse(null, { status: 404 });
  }

  let fileBuffer = readUploadFile(decodedSlug);
  let contentType = contentTypeFor(decodedSlug.at(-1) ?? "");

  if (!fileBuffer) {
    try {
      const upstream = await fetch(
        `http://127.0.0.1:3001/uploads/${decodedSlug.map(encodeURIComponent).join("/")}`,
      );

      if (!upstream.ok) {
        return new NextResponse(null, { status: 404 });
      }

      fileBuffer = Buffer.from(await upstream.arrayBuffer());
      const upstreamType = upstream.headers.get("content-type")?.split(";")[0]?.trim();
      if (upstreamType?.startsWith("image/")) {
        contentType = upstreamType;
      }
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
