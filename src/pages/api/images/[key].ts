import type { APIRoute } from "astro";
import { getEnv } from "@/lib/env";
import { getBlob } from "@/lib/blob";

export const prerender = false;

// GET /api/images/<key> — stream an uploaded gear photo back from R2 (or the
// in-memory fallback). Keys are unique per upload and content is immutable, so
// we cache aggressively.
export const GET: APIRoute = async ({ params, locals }) => {
  const key = params.key;
  if (!key) return new Response("Not found", { status: 404 });

  const blob = await getBlob(getEnv(locals), key);
  if (!blob) return new Response("Not found", { status: 404 });

  return new Response(blob.bytes, {
    status: 200,
    headers: {
      "Content-Type": blob.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
