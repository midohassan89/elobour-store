import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".png": "image/png",
  ".gif": "image/gif",
  ".avif": "image/avif",
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
  const roots = [
    path.join(process.cwd(), "public", "uploads"),
    path.join(process.cwd(), "..", "ERP", "public", "uploads"),
  ];

  for (const uploadsDir of roots) {
    const resolvedUploadsDir = path.resolve(uploadsDir);
    const resolvedPath = path.resolve(path.join(uploadsDir, ...decodedSlug));

    if (
      resolvedPath !== resolvedUploadsDir &&
      !resolvedPath.startsWith(`${resolvedUploadsDir}${path.sep}`)
    ) {
      continue;
    }

    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      return resolvedPath;
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
