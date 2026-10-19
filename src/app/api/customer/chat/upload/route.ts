import { customerJson, customerOptions, resolveRequestCustomer } from "@/lib/customerRequest";
import { saveChatImage } from "@/lib/chatAttachment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const customer = await resolveRequestCustomer(request);
  if (!customer) return customerJson({ error: "Unauthorized" }, 401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return customerJson({ error: "file is required" }, 400);
  }

  try {
    const saved = await saveChatImage(file);
    return customerJson(saved, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TOO_LARGE") {
      return customerJson({ error: "Image must be smaller than 8 MB" }, 400);
    }
    return customerJson({ error: "Unsupported image" }, 400);
  }
}

export function OPTIONS() {
  return customerOptions();
}
