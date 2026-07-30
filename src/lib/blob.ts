// Object storage for uploaded gear photos. In production this is a Cloudflare
// R2 bucket (bound as GEAR_BUCKET); the Cloudflare adapter's platform proxy
// gives local `astro dev` / `wrangler dev` an emulated bucket with no setup.
//
// As with storage.ts, if the binding is absent (a bare Node run) we fall back
// to a module-level in-memory map so the app still works — uploads just won't
// survive a restart. All access is async so either backend fits one interface.

// Minimal shapes of the R2 API we use — avoids a hard dependency on the
// Workers type packages at build time.
interface R2Object {
  httpMetadata?: { contentType?: string };
}
interface R2ObjectBody extends R2Object {
  arrayBuffer(): Promise<ArrayBuffer>;
}
export interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<R2Object>;
  get(key: string): Promise<R2ObjectBody | null>;
}

interface BlobEnv {
  GEAR_BUCKET?: R2Bucket;
}

export interface StoredBlob {
  bytes: ArrayBuffer;
  contentType: string;
}

// In-memory fallback (single process, dev only).
const memoryBlobs = new Map<string, StoredBlob>();

export async function putBlob(
  env: BlobEnv | undefined,
  key: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const bucket = env?.GEAR_BUCKET;
  if (bucket) {
    await bucket.put(key, bytes, { httpMetadata: { contentType } });
    return;
  }
  memoryBlobs.set(key, { bytes, contentType });
}

export async function getBlob(env: BlobEnv | undefined, key: string): Promise<StoredBlob | null> {
  const bucket = env?.GEAR_BUCKET;
  if (bucket) {
    const obj = await bucket.get(key);
    if (!obj) return null;
    return {
      bytes: await obj.arrayBuffer(),
      contentType: obj.httpMetadata?.contentType ?? "application/octet-stream",
    };
  }
  return memoryBlobs.get(key) ?? null;
}
