# NEURONS · NeuralNS

**Namespace Protocol for AI Agents on Solana — live on mainnet.**
Claim a human-readable `name.agent` handle for an autonomous agent, mint a capability-rich **AgentCard** NFT, and get discovered by function — like ENS/SNS, but built for machines.

> Live: **https://neuralns.xyz** · Program: [`5dqCWiZvLWD1Nge15UhXyGCGd2rF8uN6nPigdnLRWCv1`](https://solscan.io/account/5dqCWiZvLWD1Nge15UhXyGCGd2rF8uN6nPigdnLRWCv1) · $NEURONS: [`GdKEzVqS6yU3H1hfwzdiRCXjGE3nsBqRMAj17EqEpump`](https://solscan.io/token/GdKEzVqS6yU3H1hfwzdiRCXjGE3nsBqRMAj17EqEpump)

---

## ✦ What this is

A working, end-to-end implementation of the NeuralNS protocol (concept in [`cd.md`](./cd.md)):

- **On-chain program** (native Solana, no Anchor) — every `.agent` name is a PDA storing owner, resolver, expiry, verified flag, AgentCard mint and metadata URI. All economics (tier prices, payment token, treasury, holder discount) live in a **config PDA** the admin can update in one transaction — no program upgrades to change a price or swap the token.
- **AgentCard NFT** — Token-2022 NFT (metadata extension, optional soulbound/non-transferable) minted to the owner's wallet in the same transaction as registration.
- **Registry & resolution** — forward resolution is a trustless PDA read; reverse / discover / explore are served by an indexer over `getProgramAccounts`. **Everything shown on the site is live mainnet data** — nothing simulated.
- **$NEURONS payments** — pay registration in SOL or in $NEURONS. Token prices track the SOL tier price via an off-chain peg, with the 25% holder discount baked in: paying in $NEURONS always gets the holder rate.

## ✦ Pricing

| Name length | Price | Tier | Expiry |
|---|---|---|---|
| 1–4 chars | **5 ◎** | Premium | Permanent |
| 5–9 chars | **1 ◎ / yr** | Standard | Renewable |
| 10+ chars | **0.1 ◎ / yr** | Accessible | Renewable |
| Verified badge | 0.01 ◎ | Add-on | One-time |

$NEURONS holders (≥ ~$10 worth) get **25% off** SOL fees on-chain; the $NEURONS price always equals 75% of the SOL tier value.

## ✦ Stack

| Layer | Tech |
|---|---|
| Program | Native Solana (Rust, no Anchor) · Token-2022 · config PDA economics |
| Web | Next.js 15 · React 19 · TypeScript · Tailwind v4 · Reown AppKit (Phantom, Solflare, Backpack…) |
| API | NestJS 11 · on-chain indexer (`getProgramAccounts` via Helius) · atomic JSON store for AgentCard manifests |
| Ops | pm2 + nginx + Let's Encrypt · price-peg daemon |

## ✦ Run it

```bash
npm install          # installs both workspaces
npm run dev          # API on :4000, web on :3000
```

Open **http://localhost:3000**. The API needs `apps/api/.env` with `SOLANA_RPC=<your rpc url>` (see `apps/api/.env.example`).

## ✦ API surface

```
GET  /api/resolve/:name             forward resolution → wallet + metadata
GET  /api/reverse/:wallet           reverse → primary name
GET  /api/agent/:name               full record + history + siblings
GET  /api/agent/:name/capabilities  AgentCard JSON (Metaplex-compatible)
GET  /api/agent/:name/card.json     NFT metadata (what wallets fetch)
GET  /api/names/:wallet             names owned by a wallet
GET  /api/discover?capability=&category=
GET  /api/explore?q=&category=&tier=&verified=&sort=&page=
GET  /api/availability?name=        live on-chain availability
GET  /api/leaderboard  /api/categories  /api/stats  /api/stats/timeline  /api/activity
POST /api/register                  store the AgentCard manifest after on-chain registration
```

Forward resolution works without this API at all — derive the PDA `["name", sha256(name)]` and read the account (see `/docs` on the site or [`onchain/README.md`](./onchain/README.md)).

## ✦ Program instructions

`Register` (SOL, tiered fee, optional holder discount) · `RegisterWithToken` ($NEURONS via transfer_checked) · `UpdateResolver` · `Transfer` · `Renew` · `UpdateMetadata` · `MintAgentCard` (soulbound optional) · `Verify` · `InitConfig` / `UpdateConfig` (admin economics).

No admin keys over names: every name mutation requires the owner's signature.

## ✦ Scripts

```
scripts/neurons-admin.mjs    status | update-config | register | mint-card | verify-name | resolve
scripts/peg-prices.mjs       keeps $NEURONS prices equal to the SOL tiers (--watch N minutes)
scripts/launch-token.mjs     one-shot token switchover: waits for mint + first price, flips config atomically
scripts/seed-agents.ps1      one-time mainnet seeding of the initial agent set
```

## ✦ Layout

```
NEURONS/
├─ apps/
│  ├─ api/   NestJS — registry, on-chain indexer, RPC proxy, manifest store
│  └─ web/   Next.js — app router pages, components, Reown config, program client
├─ onchain/  the Solana program (Rust) + build & verify tooling
├─ scripts/  admin CLI, price peg, launch switchover
└─ cd.md     the original concept paper
```

## ✦ Production

Live at **https://neuralns.xyz** — pm2 (`neuralns-api` :4137, `neuralns-web` :3137, `neuralns-peg`) behind nginx with Let's Encrypt. Redeploy: upload the tarball, rebuild (`npm install && npm run build:api && npm run build:web`), `pm2 restart neuralns-api neuralns-web`.

---

NEURONS — NeuralNS · $NEURONS · Solana Mainnet · [x.com/NeuralNS](https://x.com/NeuralNS)
