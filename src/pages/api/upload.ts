import type { APIRoute } from "astro";
import { getEnv } from "@/lib/env";
import { putBlob } from "@/lib/blob";
import { makeId } from "@/lib/ids";

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Accepted image types → file extension used in the object key.
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/upload — multipart/form-data with a single `file` field. Stores the
// image in R2 (the GEAR_BUCKET binding) and returns its object key. The key is
// later attached to a piece of gear and served back via GET /api/images/<key>.
export const POST: APIRoute = async ({ request, locals }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Expected multipart form data." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "No file provided." }, 400);
  }

  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return json({ error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." }, 400);
  }
  if (file.size === 0) {
    return json({ error: "The uploaded file is empty." }, 400);
  }
  if (file.size > MAX_BYTES) {
    return json({ error: "Image is too large. Max 5 MB." }, 400);
  }

  const key = `${makeId("img")}.${ext}`;
  try {
    const bytes = await file.arrayBuffer();
    await putBlob(getEnv(locals), key, bytes, file.type);
  } catch {
    return json({ error: "Could not store the image." }, 500);
  }

  return json({ key, url: `/api/images/${key}` }, 201);
};
