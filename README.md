# ⛽ FuelX — Instant On-Demand Fuel Delivery

> **Fuel at your door in under 60 minutes.**  
> Sealed jerrycans. Live tracking. Cryptographic handover. Delivered anywhere in Abuja.

[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x_Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_M0-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![Zero-Key Boot](https://img.shields.io/badge/Setup-Zero--Key_Boot-FF7A1A?style=flat-square)](#%EF%B8%8F-quick-start-zero-key-boot)

---

## 🚀 The Mission

In Abuja, power outages impact over 70% of households, leading to endless queues at filling stations and inflated black-market prices. **FuelX** eliminates the hassle by connecting stranded motorists, homes running generators, and small businesses with verified fuel suppliers and motorcycle couriers for doorstep delivery within **30 to 60 minutes**.

Built as an ultra-resilient modular monolith, FuelX combines real-time geospatial tracking, cryptographic delivery validation, and tamper-evident station seals to ensure absolute product integrity from the pump to your generator.

---

## ⚡ Architecture & Tech Stack

FuelX runs as a single modular Express process backed by MongoDB, requiring **zero external API keys** out of the box thanks to pluggable driver interfaces and built-in mocks.

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime & Core** | Node.js 22 LTS, Express 4, TypeScript 5 (`strict`) | Modular monolith REST API & static PWA server |
| **Database & Geo** | MongoDB Atlas M0 / `mongodb-memory-server` | Persistence, atomic ledgers & `2dsphere` spatial indexing |
| **Realtime Engine** | Socket.IO (in-process, typed event map) | Sub-3s driver GPS streaming, order state & admin feeds |
| **Validation & Auth** | Zod (`.strict()`), JWT (rotating refresh), Bcryptjs | Input sanitization, RBAC (`customer`, `driver`, `admin`) |
| **Payments** | Paystack & Mock Driver | Card checkout, in-app wallet top-ups & Cash-on-Delivery |
| **Maps & Routing** | Leaflet, OpenStreetMap, Haversine / ORS | Interactive pins, distance calculation & ETA smoothing |
| **Frontend** | Vanilla TypeScript, CSS Tokens, esbuild, PWA | Zero-framework client with offline support & Wake Lock |

---

## 🔒 The Secret Sauce: Tamper-Evident Seals & OTP

Trust is paramount when transporting petroleum products. FuelX enforces a two-tier physical-to-digital verification loop:

1. **Station Sealing:** Jerrycans (25L capacity) are filled at partner stations and locked with unique, single-use tamper-evident serial codes (`FX-XXXX-XXXX`). Drivers capture photographic proof before departure.
2. **Doorstep Verification:** Customers inspect the seal codes and photos directly in the web app. Handover is authorized securely using a deterministic 6-digit cryptographic OTP derived via HMAC-SHA256:

   $$\text{OTP} = \text{HMAC}_{\text{SHA256}}(\text{SECRET}, \text{orderId} + \text{salt}) \pmod{1000000}$$

3. **Public Verifier:** Anyone can inspect a seal's authenticity and lifecycle status (`UNUSED`, `APPLIED`, `VERIFIED`, `BROKEN`) instantly via `/public/seals/:code/verify` without exposing customer data.

---

## 📐 Precision Pricing Engine

Fuel costs, surge multipliers, delivery fees, and service charges are computed deterministically via a pure pricing engine. Money is stored strictly as **integer kobo** ($\#1 = 100\text{ kobo}$) to eliminate floating-point rounding errors.

The total customer price $T$ is calculated as:

$$T = F + D + S + V$$

* **$F = L \cdot p$** — Fuel subtotal (Litres $L$ $\times$ retail price per litre $p$)
* **$D = \text{round}_{\Delta}\left(\left(B + P \cdot \lceil \max(0, d - c) \rceil\right) \cdot s\right)$** — Distance-based delivery fee with road distance $d$, base coverage $c$, and demand surge multiplier $s \in [1.0, 1.5]$
* **$S = \text{round}_{\Delta}(r \cdot F)$** — Platform service fee ($r = 17.5\%$)
* **$V = \text{round}_{\Delta}((D + S) \cdot v)$** — VAT on fees

---

## 🔄 Order Lifecycle & Dispatch

FuelX manages orders through an atomic **11-state finite state machine** (`transitionOrder()`), preventing race conditions via compare-and-set MongoDB updates and an append-only financial ledger:

```text
[PENDING_PAYMENT] ──▶ [SEARCHING_DRIVER] ──▶ [DRIVER_ASSIGNED] ──▶ [AT_STATION]
                                                                        │
[DELIVERED] ◀── [ARRIVED] ◀── [EN_ROUTE] ◀── [SEALED] ◀─────────────────┘
