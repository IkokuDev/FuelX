# FuelX

On-demand fuel delivery for Abuja: petrol and diesel delivered to any address in
sealed jerrycans, with live tracking and card, wallet or cash payment.

FuelX serves **every vehicle type** (motorcycle, tricycle, car, van, pickup and
truck) — delivery capacity is driven by `vehicle.maxLitres`, not by the type. See
[docs/DECISIONS.md](docs/DECISIONS.md).

One Node process serves the REST API, Socket.IO, the static web client and the
background jobs, backed by MongoDB.

## Quick start

```bash
npm install
cp .env.example .env      # optional: works with no keys
npm run dev               # boots with an in-memory MongoDB, no external keys
```

Open http://localhost:3000 — `GET /healthz` returns `{ "success": true, "data": { "status": "ok" } }`.

Leaving `MONGODB_URI` empty outside production boots an in-memory MongoDB, so the
app starts with zero external API keys. Set `MONGODB_URI` to use a real database.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Run the server with tsx watch |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check server and client |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run test:coverage` | Vitest with coverage gates |
| `npm run build:client` | Bundle the browser client into `public/js` |
| `npm run seed` | Seed admin, customers, drivers, stations, seals, pricing |
| `npm run simulate` | Fake drivers and orders for demos and load checks |
| `npm run smoke <url>` | Post-deploy smoke check |

## Layout

```
src/            server, app, config, models, modules, providers, middleware, lib, jobs
client/src/     browser TypeScript bundled by esbuild into public/js
public/         static pages, css, service worker, build output
scripts/        seed, simulate, build-client, smoke
tests/          unit, integration and helpers
docs/           DECISIONS.md and API.md
```

## Conventions

- Money is an integer number of kobo. Never use floats for money.
- Validation is Zod at the edge; layering is route → controller → service → model.
- Every order status change goes through `transitionOrder()`.
- Config comes only from `src/config/env.ts`; business rates come from the
  `PricingConfig` document.
