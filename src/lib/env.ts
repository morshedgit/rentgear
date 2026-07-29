import type { RuntimeEnv } from "./storage";

// Astro's Cloudflare adapter exposes bindings at `Astro.locals.runtime.env`
// (and the same on endpoint `context.locals`). This narrows that to the subset
// of bindings we use, and tolerates the binding being absent (bare Node runs).
export function getEnv(locals: App.Locals | undefined): RuntimeEnv | undefined {
  return locals?.runtime?.env as RuntimeEnv | undefined;
}
