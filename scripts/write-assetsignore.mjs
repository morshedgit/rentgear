// The Astro Cloudflare adapter emits a Pages-style `dist/` (a `_worker.js/`
// server bundle + a `_routes.json`). When we deploy that same output as a
// *Worker* with static assets, Cloudflare would otherwise try to upload
// `_worker.js` (our server code) and `_routes.json` as public assets and
// abort the deploy. Writing an `.assetsignore` into the asset root excludes
// them from the asset upload — the worker itself still ships via `main`.
import { writeFileSync } from "node:fs";

const target = new URL("../dist/.assetsignore", import.meta.url);
writeFileSync(target, "_worker.js\n_routes.json\n");
console.log("Wrote dist/.assetsignore (_worker.js, _routes.json)");
