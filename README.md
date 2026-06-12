# NEURONS · NeuralNS

**Namespace Protocol for AI Agents on Solana.**
Claim human-readable `name.agent` handles for autonomous agents, mint a capability-rich **AgentCard** NFT, and get discovered by function — like ENS/SNS, but built for machines.

> `$NEURONS` · Solana Mainnet · 2026 · a full-stack reference implementation of the concept in [`cd.md`](./cd.md).

---

## ✦ What this is

A production-grade, **atypical** web experience + working backend for the NeuralNS protocol:

- **Frontend** — Next.js 15 (App Router, React 19) with a bespoke design system: oversized **Space Grotesk** display + **JetBrains Mono** everywhere a handle/number appears, a live **neural-network canvas** background (on-brand for NEURONS), a custom mint **reticle cursor**, a **⌘K command palette**, smooth scroll, scramble/typewriter text, and a near-black canvas with a single electric-mint accent.
- **Backend** — NestJS 11 REST API mirroring the protocol spec (`/resolve`, `/reverse`, `/discover`, `/register`, …) over a **crash-safe persisted store**.
- **Live simulation** — a population of human-like "agents" that continuously register, verify, renew, transfer, mint AgentCards and serve tasks. The state is **persisted to disk and resumes across restarts** — it never resets.
- **Connect Wallet** — the official **Reown AppKit** modal (Solana adapter), featuring the real Solana wallets (Phantom, Solflare, Backpack…) with their **official logos** pulled from the WalletConnect registry. No logos are hand-made.

## ✦ Stack

| Layer | Tech |
|---|---|
| Web | Next.js 15 · React 19 · TypeScript · Tailwind v4 · framer-motion · cmdk · lenis |
| Wallet | Reown AppKit `@reown/appkit` + `@reown/appkit-adapter-solana` |
| Icons | `@web3icons/react` (official wallet + token logos, MIT) |
| API | NestJS 11 · `@nestjs/schedule` · dependency-free atomic JSON store |
| Fonts | Space Grotesk · JetBrains Mono · Inter (all OFL, self-hosted via `next/font`) |

## ✦ Run it

```bash
# from the repo root
npm install          # installs both workspaces
npm run dev          # API on :4000, web on :3000 (concurrently)
```

Open **http://localhost:3000**.

Run individually:

```bash
npm run dev:api      # NestJS on http://localhost:4000/api
npm run dev:web      # Next.js on http://localhost:3000
```

Production:

```bash
npm run build
npm run start:api    # node dist
npm run start:web
```

### Environment

The web app ships with sensible defaults and needs no setup. To override, copy `apps/web/.env.example → apps/web/.env.local`:

```
NEXT_PUBLIC_PROJECT_ID=<your reown project id>   # default: provided key
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

API env (`apps/api/.env.example`): `PORT`, `WEB_ORIGIN`, `NEURONS_DB`.

## ✦ The simulation (human-like, persistent)

The "bots" are designed to feel like a real, living user base — not a metronome:

- **Diurnal rhythm** — activity ebbs and flows with a 24-hour UTC curve (deep lull ~06:00, peak in the Americas evening).
- **Poisson arrivals** — events arrive with true exponential inter-arrival times + minute-to-minute jitter, plus occasional organic **bursts** ("fleet deployments").
- **Believable identities** — names composed from 50+ agent personas across 11 categories (`executor.defi.agent`, `oracle.price.agent`, `sentinel.security.agent`…), with realistic capability sets, base58 pubkeys, reputation distributions (Gaussian, verified agents skew higher) and SOL amounts.
- **Weighted behaviour** — verified, high-reputation agents serve most of the tasks; registrations taper as the namespace saturates (adoption S-curve).
- **Persistence** — every mutation is flushed to `apps/api/data/neurons.json` via an **atomic write** (temp-file + rename). On restart the registry **resumes exactly where it left off** and replays an approximate amount of activity for the offline gap, so the world keeps turning. It never falls back to empty.

Tunables live in [`apps/api/src/simulation/simulation.service.ts`](./apps/api/src/simulation/simulation.service.ts).

## ✦ API surface

```
GET  /api/resolve/:name             forward resolution → wallet + metadata
GET  /api/reverse/:wallet           reverse → primary name
GET  /api/agent/:name               full record + history + siblings
GET  /api/agent/:name/capabilities  AgentCard JSON
GET  /api/names/:wallet             names owned by a wallet
GET  /api/discover?capability=&category=
GET  /api/explore?q=&category=&tier=&verified=&sort=&page=
GET  /api/availability?name=&category=
GET  /api/leaderboard   /api/categories   /api/stats   /api/stats/timeline   /api/activity
POST /api/register      { label, category?, owner?, capabilities?, endpoint?, soulbound? }
```

`POST /api/register` is the **minimal working backend**: it actually persists a user-claimed name, derives its PDA, mints an AgentCard and records it in the live feed.

## ✦ Pages

`/` landing · `/explore` registry directory · `/register` working claim flow · `/agent/[name]` AgentCard passport · `/stats` live telemetry · `/docs` SDK & REST reference.

## ✦ Proof of work

See [`/screenshots`](./screenshots) — captured from the running app: landing, explore, register, agent detail, stats, docs, the ⌘K palette, and the Reown Connect Wallet modal with Phantom/Solflare/Backpack.

## ✦ Production deployment

Live at **https://neuralns.xyz**. The app is deployed in isolation on a shared VPS so it can't interfere with the other sites on the box:

- Source in `/var/www/neuralns`; built with Node 20.
- Two **pm2** processes — `neuralns-api` (127.0.0.1:**4137**) and `neuralns-web` (:**3137**) — defined in [`ecosystem.config.js`](./ecosystem.config.js). App ports are firewalled (ufw allows only 80/443/SSH).
- A dedicated **nginx** vhost proxies `/` → web and `/api/` → api, with a Let's Encrypt cert (auto-renew). No other vhost is touched; nginx is only ever `reload`ed, never restarted.
- Build-time `NEXT_PUBLIC_API_URL=https://neuralns.xyz/api` (browser) + runtime `API_INTERNAL_URL=http://127.0.0.1:4137/api` (SSR hits the API directly over localhost).

Redeploy: rebuild on the server (`npm install && npm run build:api && npm run build:web`) then `pm2 restart neuralns-api neuralns-web`.

## ✦ Layout

```
NEURONS/
├─ apps/
│  ├─ api/   NestJS — domain, store (atomic JSON), registry, simulation
│  └─ web/   Next.js — app router pages, components, lib, Reown config/context
├─ screenshots/
└─ cd.md     the original concept
```
