import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".png": "image/png",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadsDir, ...slug);
  const resolvedPath = path.resolve(filePath);
  const resolvedUploadsDir = path.resolve(uploadsDir);

  if (
    resolvedPath !== resolvedUploadsDir &&
    !resolvedPath.startsWith(`${resolvedUploadsDir}${path.sep}`)
  ) {
    return new NextResponse(null, { status: 404 });
  }

  if (!fs.existsSync(filePath)) {
    return new NextResponse(null, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
