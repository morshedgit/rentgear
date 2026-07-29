# RentGear 🏔️

A peer-to-business outdoor gear rental marketplace, built with **Astro** and
deployed to **Cloudflare**.

**The model:** people who own outdoor gear they aren't using consign it to the
business. The business stores, inspects, and maintains that gear at physical
**hubs**, then rents it out to people heading outdoors. Renters pick up and drop
off at a hub. Every completed rental pays the lender a share; the business keeps
a service fee.

```
Lender  ──consigns gear──▶  Business (hubs)  ──rents out──▶  Renter
   ▲                                                            │
   └──────────────── payout on each rental ◀───────────────────┘
```

## Features

- **Home** — the pitch, how it works, featured gear, and hub locations.
- **Browse gear** (`/gear`) — searchable, filterable catalog (by category and hub).
- **Gear detail** (`/gear/[id]`) — full specs plus a live booking widget with a
  cost breakdown, date-conflict checking, and pickup/drop-off hub selection.
- **Hubs** (`/hubs`) — every pickup/drop-off location with hours, contact, live
  inventory counts, and map directions.
- **Lend your gear** (`/lend`) — a consignment form with a live earnings
  estimate. Submissions land as "pending" for the ops team to review.
- **Business dashboard** (`/dashboard`) — KPIs (service revenue, owner payouts,
  active rentals, stock), a queue to approve/decline pending gear, a rentals
  table with lifecycle controls (mark picked up / returned / cancel), and full
  inventory.

## Tech

- **Astro 5** (server / SSR output) with the **Cloudflare adapter**
- **React 19** islands for the interactive pieces (booking form, lend form,
  dashboard actions); everything else is server-rendered Astro
- **Tailwind CSS** for styling (earthy, outdoors-y theme)
- **Cloudflare KV** for persistence — the whole marketplace is one JSON
  document. The data-access layer (`src/lib/storage.ts`) is isolated behind a
  small async interface so it could be swapped for D1 later.

## Getting started

```bash
npm install
npm run dev
# open http://localhost:4321
```

Locally, the Cloudflare adapter's **platform proxy** provides an emulated KV
namespace (persisted under `.wrangler/`), so `npm run dev` works with no extra
setup and no database. If the KV binding is ever absent, the store falls back to
an in-memory copy of the seed data.

Delete `.wrangler/state` (or the emulated KV entry) to reset the marketplace
back to the seed data in `src/lib/seed.ts`.

## Deploying to Cloudflare

1. Create a KV namespace and copy its id into `wrangler.toml`:

   ```bash
   npx wrangler kv namespace create GEAR_KV
   ```

2. Build and deploy:

   ```bash
   npm run deploy      # astro build && wrangler pages deploy ./dist
   ```

   (Or connect the repo in the Cloudflare Pages dashboard with build command
   `npm run build` and output directory `dist`, and bind the `GEAR_KV`
   namespace.)

## Project layout

```
src/
  layouts/Layout.astro       # shared page shell (header + footer)
  components/                # UI — .astro (static) + .tsx (React islands)
  pages/
    index.astro              # home
    gear/                    # catalog + detail
    hubs/                    # hub directory
    lend/                    # consignment flow
    dashboard/               # business ops view
    api/
      rentals/               # create reservation, advance lifecycle
      lend.ts                # submit gear for review
      gear/[id].ts           # approve / decline / maintenance actions
  lib/
    types.ts                 # domain model
    seed.ts                  # initial marketplace data
    storage.ts               # KV / in-memory store (async)
    repo.ts                  # pure read-side queries over a snapshot
    logic.ts                 # pricing, availability, date + money helpers
    metrics.ts               # dashboard aggregates
    env.ts                   # pulls the KV binding off Astro.locals
astro.config.mjs
wrangler.toml
```

## Money model

Rental subtotal = daily price × days (inclusive). The renter pays
`subtotal + service fee + refundable deposit` at pickup. The business keeps the
service fee (25% by default, `SERVICE_FEE_RATE` in `src/lib/types.ts`); the
lender earns the remaining 75% of the subtotal.

> **Note on concurrency:** KV has no transactions, so two simultaneous writes
> can race. That's fine for this demo; a production build would move to
> Cloudflare D1 (SQLite) behind the same `storage.ts` interface.
