# neurons_registry v2 — on-chain `.agent` namespace (native Solana, no Anchor)

A real Solana program. A name is a PDA `["name", sha256(name)]` storing
**owner / resolver / expiry / verified / card_mint / name / metadata_uri** on
chain. All economics live in a **Config PDA** (`["config"]`) updatable by the
admin — the payment token, prices, discounts and treasury can be swapped any
time with one `UpdateConfig` transaction, **no program upgrade needed**.

## Live on Solana mainnet-beta

- **Program v2:** [`5dqCWiZvLWD1Nge15UhXyGCGd2rF8uN6nPigdnLRWCv1`](https://explorer.solana.com/address/5dqCWiZvLWD1Nge15UhXyGCGd2rF8uN6nPigdnLRWCv1)
- **Config PDA:** `8yKGeT8AZWFMmBVpjTdf9mw2jmPfHLBtr4w6k39BFjeU`
- **Deployer / admin / treasury:** `8AQFyZvs9pQAxFaBYcRdJXHNpR8vFkUxQahRdrHzsDvN`
  (keypair: `~/.config/solana/neurons-deployer.json` — also the upgrade
  authority; `solana program close 5dqCWiZ… --bypass-warning` recovers the
  program rent to this wallet)
- **Test payment token (Token-2022, 6 dec):** `GpKYqw6Gf9CAfK2eZwViMdzsVfKwAaPw8bvuRWnuY4Je`
- v1 program `7DFyaue…R5J6` is superseded (its names were re-registered in v2).

## Instructions

| ix | who signs | effect |
|----|-----------|--------|
| `Register { name, resolver, years, metadata_uri }` | payer | create the name PDA, pay the SOL fee by length tier (1–4 chars = permanent premium, 5–9 standard/yr, 10+ accessible/yr). Optional trailing `[mint, payer_ata]` applies the holder discount. Expired names past the 30-day grace can be re-taken. |
| `RegisterWithToken { … }` | payer | same, fee paid in the configured token (`transfer_checked`, classic SPL or Token-2022) |
| `UpdateResolver { resolver }` | owner | repoint resolution |
| `Transfer { new_owner }` | owner | change owner |
| `Renew { years }` | payer | extend expiry (tiered fee; permanent names don't renew) |
| `UpdateMetadata { uri }` | owner | set the AgentCard manifest URI |
| `MintAgentCard { soulbound }` | owner | mint the AgentCard as a Token-2022 NFT at PDA `["card", sha256(name)]`: metadata extension (name/symbol/uri), optional non-transferable, supply locked at 1 |
| `Verify` | owner | pay the verify fee → `verified = true` |
| `SetVerified { verified }` | admin | protocol override of the flag |
| `InitConfig { params }` | hardcoded ADMIN | bootstrap the config PDA |
| `UpdateConfig { params }` | config admin | update any economics — **this is how the payment token is swapped before launch** |

## Admin CLI (`../scripts/neurons-admin.mjs`)

```bash
node scripts/neurons-admin.mjs status                 # config + balances
node scripts/neurons-admin.mjs update-config --token-mint <MINT> --token-decimals 6
node scripts/neurons-admin.mjs update-config --premium 5 --standard 1 --accessible 0.1   # launch prices (SOL)
node scripts/neurons-admin.mjs register <name>.agent [--discount]
node scripts/neurons-admin.mjs register-token <name>.agent
node scripts/neurons-admin.mjs mint-card <name>.agent [--soulbound]
node scripts/neurons-admin.mjs verify-name <name>.agent
node scripts/neurons-admin.mjs resolve <name>.agent
```

Current config runs **test prices** (premium 0.005 / standard 0.002 /
accessible 0.001 SOL, 25% holder discount, test token above). Flip to real
prices + the real $NEURONS mint with two `update-config` calls before launch.

## Build & deploy

Windows host lacks an MSVC linker, so the SBF build runs in WSL with vendored
deps (`vendor/` + `.cargo/config.toml`, created via `cargo vendor` on the host):

```bash
# host (once, refresh deps):  cargo vendor vendor
wsl -d Ubuntu -e bash -lc "cd /mnt/c/.../NEURONS/onchain && cargo build-sbf"
solana program deploy target/deploy/neurons_registry.so \
  --program-id target/deploy/neurons_registry-keypair.json \
  -k ~/.config/solana/neurons-deployer.json -u mainnet-beta \
  --with-compute-unit-price 2000 --max-sign-attempts 100
```
