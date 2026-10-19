import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 8 * 1024 * 1024;

export function isChatAttachmentPath(value: string) {
  return /^\/uploads\/chat\/[a-zA-Z0-9.-]+$/.test(value);
}

function chatDirectory() {
  const configured = process.env.ERP_UPLOADS_DIR?.trim();
  if (configured) {
    return [configured.replace(/[/\\]+$/, ""), "chat"].join(path.sep);
  }

  if (process.env.NODE_ENV === "production") {
    return ["", "var", "www", "egychina-erp", "public", "uploads", "chat"].join("/");
  }

  return [process.cwd(), "..", "ERP", "public", "uploads", "chat"].join(path.sep);
}

/** Save a customer chat photo where the ERP and the uploads route can both read it. */
export async function saveChatImage(file: File) {
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    throw new Error("UNSUPPORTED");
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("TOO_LARGE");
  }

  const filename = `${randomUUID()}.${extension}`;
  const directory = chatDirectory();
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));

  return {
    url: `/uploads/chat/${filename}`,
    attachmentType: "IMAGE" as const,
  };
}
