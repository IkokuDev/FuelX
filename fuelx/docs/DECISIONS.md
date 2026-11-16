# Decisions

Format: **date — decision — reason.**

## 2026-11-16 — Support all vehicle types, not only motorcycles

The development plan (section 2 and 6) assumes motorcycle delivery. The product owner
requires the platform to suit all vehicles. Therefore `DriverProfile.vehicle.type` is an
enum covering `motorcycle`, `tricycle`, `car`, `van`, `pickup` and `truck`, and the driver
onboarding form, matching engine and UI copy never assume a motorcycle. Capacity is
driven by `vehicle.maxLitres` (default 50) rather than a fixed motorcycle limit. Copy that
says "motorcycle" in the plan is written as "vehicle" in the app.

## 2026-11-16 — In-memory MongoDB in development when MONGODB_URI is unset

Section 5 lists `MONGODB_URI` as required and section 1 requires a zero-key boot. The
simplest option consistent with both is: if `MONGODB_URI` is empty and `NODE_ENV` is not
`production`, `db/connect.ts` starts a `mongodb-memory-server` instance; in `production`
an empty `MONGODB_URI` crashes the process at boot with a clear message.

## 2026-11-16 — Node version

The host provides Node 26 LTS-family. The plan asks for Node 22 LTS. The code targets
ES2022 and the documented `engines` floor is `>=20`, so both work; CI pins Node 22.

## 2026-11-16 — ESLint 8 with `.eslintrc.cjs`

Kept the classic `.eslintrc.cjs` config with ESLint 8.57 instead of migrating to a flat
config, matching the file listed in section 4.
