import { seedData } from "./seed";
import type { Database } from "./types";

// Persistence lives in a single Cloudflare KV entry that holds the whole
// marketplace as one JSON document. KV is simple to provision ("easier to
// deploy") and, via the Cloudflare adapter's platform proxy, the same code
// path runs in local `astro dev` against an emulated namespace.
//
// If no KV binding is present (e.g. a bare Node run without the platform
// proxy) we fall back to a module-level in-memory store so the app still runs
// — data just won't survive a restart. All access is async so either backend
// works behind the same interface.

const KV_KEY = "db";

// Minimal shape of the KV namespace we use — avoids a hard dependency on the
// Workers type packages at build time.
interface KVNamespace {
  get(key: string, type: "json"): Promise<Database | null>;
  put(key: string, value: string): Promise<void>;
}

export interface RuntimeEnv {
  GEAR_KV?: KVNamespace;
}

// In-memory fallback (single process, dev only).
let memoryDb: Database | null = null;

function getKV(env?: RuntimeEnv): KVNamespace | null {
  return env?.GEAR_KV ?? null;
}

export async function loadDb(env?: RuntimeEnv): Promise<Database> {
  const kv = getKV(env);
  if (kv) {
    const existing = await kv.get(KV_KEY, "json");
    if (existing) return existing;
    const seeded = seedData();
    await kv.put(KV_KEY, JSON.stringify(seeded));
    return seeded;
  }
  if (!memoryDb) memoryDb = seedData();
  return memoryDb;
}

export async function saveDb(env: RuntimeEnv | undefined, db: Database): Promise<void> {
  const kv = getKV(env);
  if (kv) {
    await kv.put(KV_KEY, JSON.stringify(db));
    return;
  }
  memoryDb = db;
}

// Load, mutate, and persist in one step. The callback mutates the passed-in
// database and returns whatever the caller needs.
export async function mutateDb<T>(env: RuntimeEnv | undefined, fn: (db: Database) => T): Promise<T> {
  const db = await loadDb(env);
  const result = fn(db);
  await saveDb(env, db);
  return result;
}
