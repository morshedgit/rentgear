# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RentGear is a peer-to-business outdoor gear rental marketplace. The business model drives the
domain model, so keep it in mind: **lenders** consign gear they aren't using, the **business** stores
and maintains it at physical **hubs**, and **renters** pick up / drop off at a hub. Every completed
rental splits revenue — the business keeps `SERVICE_FEE_RATE` (25%), the lender earns the rest.

## Commands

```bash
npm install
npm run dev        # astro dev on http://localhost:4321
npm run build      # astro build (Cloudflare adapter output in ./dist)
npm run preview    # preview the built worker
npm run deploy     # astro build && wrangler pages deploy ./dist
```

There is no test suite or linter configured. Verify changes by running `npm run build` (catches type
and Astro errors) and exercising flows against `npm run dev`.

To reset the marketplace to seed data, clear the local KV: delete `.wrangler/state` (dev) or the
`db` key in the deployed `GEAR_KV` namespace.

## Architecture

Astro 5 in **SSR (`output: "server"`) mode** with the **Cloudflare adapter**. Static UI is `.astro`;
the few interactive pieces are **React islands** (`@astrojs/react`) hydrated with `client:load`.
Tailwind (v3) provides styling via a custom `pine` / `sand` / `ember` theme. Path alias `@/*` → `src/*`.

### Data flow — the important part

Persistence is a **single Cloudflare KV entry** (`GEAR_KV`, key `"db"`) holding the entire database as
one JSON document. This layer is deliberately isolated so it could later be swapped for D1.

- `src/lib/storage.ts` — `loadDb(env)`, `saveDb(env, db)`, `mutateDb(env, fn)`. All **async**. If the
  KV binding is absent it falls back to a module-level in-memory copy of the seed (dev only).
- The KV binding is reached via `Astro.locals.runtime.env` (Cloudflare adapter). `platformProxy` is
  enabled in `astro.config.mjs`, so local `astro dev` gets an **emulated KV** with no setup — the same
  code path runs in dev and production. `src/lib/env.ts#getEnv(Astro.locals)` extracts the binding.
- **Standard page pattern:** load the snapshot once, then call pure query functions on it:
  ```ts
  const db = await loadDb(getEnv(Astro.locals));
  const gear = getGearList(db, { categorySlug });
  ```
- `src/lib/repo.ts` — pure read-side queries over a `Database` snapshot (joins gear↔category/hub/owner,
  rentals↔gear/renter/hubs). These take `db` as their first arg; they do **not** touch storage.
- `src/lib/metrics.ts` — pure dashboard aggregates over a snapshot.
- `src/lib/logic.ts` — pricing (`quoteRental`), availability (`hasConflict`, inclusive date math),
  validation, and formatting. Pricing is the single source of truth; the `BookingForm` island mirrors
  the same formula client-side for the live quote, so keep the two in sync if you change it.
- `src/lib/seed.ts` — deterministic seed (users, 3 hubs, 6 categories, ~14 gear, 2 rentals).
- `src/lib/types.ts` — domain model + `SERVICE_FEE_RATE`.

### Write endpoints (`src/pages/api/`)

All mutate through `mutateDb(getEnv(locals), (db) => …)` and throw `HttpError(status, msg)`
(`src/lib/http.ts`) for domain failures, which the handler maps to a JSON error response.

- `POST /api/rentals` — create a reservation (validates dates, gear bookability, and date-overlap
  conflicts).
- `PATCH /api/rentals/[id]` — advance a rental's lifecycle. Transitions are constrained by the
  `TRANSITIONS` table and **side-effect the gear's status** (→ `rented` on pickup, → `available` on
  return/cancel unless another active rental still holds it).
- `POST /api/lend` — a lender consigns gear; created as `pending`, deposit auto-sized from replacement
  value. Reuses/creates a lender user by email.
- `PATCH /api/gear/[id]` — ops actions: `approve` (pending→available), `reject` (pending→retired),
  `maintenance`, `restock`.

### Status models

Gear: `pending → available ⇄ rented`, plus `maintenance` and `retired`. Only `available`/`rented` gear
appears in the public catalog (`getGearList` filters unless `includeNonPublic`).
Rental: `reserved → active → completed`, or `reserved → cancelled`.

## Deploying to Cloudflare

Create a KV namespace and paste its id into `wrangler.toml` (`GEAR_KV` binding), then `npm run deploy`
— or connect the repo in Cloudflare Pages (build `npm run build`, output `dist`) and bind `GEAR_KV`.
KV has no transactions, so concurrent writes can race; acceptable for this app, but a production build
would move to D1 behind the same `storage.ts` interface.

## Repo-specific gotchas

- **Ephemeral container:** in the Claude Code web/remote environment the working dir is recreated per
  session. Any file change (including edits to this file) must be **committed and pushed** to persist.
- If a normal `git push` is blocked in this environment, push files via the GitHub MCP tools instead.
- `package-lock.json` is intentionally not committed; `npm install` regenerates it.
- React islands must not import Next.js APIs — they were ported from a Next.js prototype. Use `<a href>`
  and `window.location.reload()` (see `AdminActions.tsx`) rather than a router.
