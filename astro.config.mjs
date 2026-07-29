// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

// Server-rendered (SSR) app deployed to Cloudflare. `platformProxy` gives us
// access to Cloudflare bindings (the KV namespace used for storage) during
// local `astro dev`, so the same data layer works in dev and in production.
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [react(), tailwind()],
});
