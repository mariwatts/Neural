# One-time: build the initial commit history for the NEURONS repo.
$ErrorActionPreference = 'Stop'

$commits = @(
  @{ d='2026-06-08T10:12:34+03:00'; m='docs: NEURONS concept paper and brand assets';
     p=@('cd.md','Header neural.png','PFP neural-Photoroom (1).png') },
  @{ d='2026-06-08T12:40:11+03:00'; m='chore: monorepo scaffold (npm workspaces)';
     p=@('package.json','package-lock.json','.gitignore') },
  @{ d='2026-06-08T15:05:48+03:00'; m='feat(api): NestJS bootstrap with crash-safe persistent store';
     p=@('apps/api/package.json','apps/api/nest-cli.json','apps/api/tsconfig.json','apps/api/tsconfig.build.json','apps/api/.env.example','apps/api/data/.gitkeep','apps/api/src/main.ts','apps/api/src/store') },
  @{ d='2026-06-08T18:22:05+03:00'; m='feat(api): domain model - name records, tier pricing, solana helpers';
     p=@('apps/api/src/domain') },
  @{ d='2026-06-08T21:47:52+03:00'; m='feat(api): agent population simulation engine (dev preview)';
     p=@('apps/api/src/simulation') },
  @{ d='2026-06-09T11:03:19+03:00'; m='feat(api): registry REST surface - resolve, reverse, discover, explore, stats';
     p=@('apps/api/src/registry') },
  @{ d='2026-06-09T13:36:40+03:00'; m='feat(web): Next.js 15 bootstrap + design tokens (Swiss/terminal, light-dark)';
     p=@('apps/web/package.json','apps/web/next.config.mjs','apps/web/postcss.config.mjs','apps/web/tsconfig.json','apps/web/next-env.d.ts','apps/web/.env.example','apps/web/src/app/globals.css','apps/web/src/app/template.tsx','apps/web/src/app/not-found.tsx','apps/web/public/icon.svg','apps/web/public/logo.png','apps/web/public/header.png') },
  @{ d='2026-06-09T16:18:27+03:00'; m='feat(web): app shell - nav, footer, theme toggle, command palette, canvas backdrop';
     p=@('apps/web/src/app/layout.tsx','apps/web/src/components/Nav.tsx','apps/web/src/components/Footer.tsx','apps/web/src/components/ThemeToggle.tsx','apps/web/src/components/Backdrop.tsx','apps/web/src/components/SmoothScroll.tsx','apps/web/src/components/Reveal.tsx','apps/web/src/components/ScrambleText.tsx','apps/web/src/components/Cursor.tsx','apps/web/src/components/CommandPalette.tsx','apps/web/src/lib/api.ts','apps/web/src/lib/types.ts','apps/web/src/lib/format.ts') },
  @{ d='2026-06-09T19:55:13+03:00'; m='feat(web): landing - hero terminal, live activity, categories, leaderboard, tiers';
     p=@('apps/web/src/app/page.tsx','apps/web/src/components/HeroTerminal.tsx','apps/web/src/components/SearchClaim.tsx','apps/web/src/components/StatStrip.tsx','apps/web/src/components/ActivityFeed.tsx','apps/web/src/components/CategoryGrid.tsx','apps/web/src/components/Leaderboard.tsx','apps/web/src/components/WalletMarquee.tsx','apps/web/src/components/TierTable.tsx','apps/web/src/components/CountUp.tsx','apps/web/src/components/MiniChart.tsx','apps/web/src/lib/categories.ts','apps/web/src/lib/capabilities.ts') },
  @{ d='2026-06-09T22:30:58+03:00'; m='feat(web): explore directory + agent passport page';
     p=@('apps/web/src/app/explore','apps/web/src/app/agent','apps/web/src/components/ExploreClient.tsx','apps/web/src/components/AgentGridCard.tsx','apps/web/src/components/AgentAvatar.tsx','apps/web/src/components/Handle.tsx','apps/web/src/components/Copyable.tsx') },
  @{ d='2026-06-10T10:41:22+03:00'; m='feat(web): register flow - availability, categories, capabilities, PDA preview';
     p=@('apps/web/src/app/register','apps/web/src/components/RegisterClient.tsx') },
  @{ d='2026-06-10T13:27:45+03:00'; m='feat(web): network stats + developer docs pages';
     p=@('apps/web/src/app/stats','apps/web/src/app/docs','apps/web/src/components/StatsClient.tsx') },
  @{ d='2026-06-10T16:54:09+03:00'; m='feat(web): wallet connect via Reown AppKit (Solana adapter)';
     p=@('apps/web/src/config','apps/web/src/context','apps/web/src/components/ConnectButton.tsx') },
  @{ d='2026-06-10T20:15:37+03:00'; m='feat(program): native Solana namespace registry - config PDA, tiers, token pay, AgentCard NFT';
     p=@('onchain') },
  @{ d='2026-06-11T09:58:02+03:00'; m='feat(web): on-chain program client - PDA derivation, register ix, config reader';
     p=@('apps/web/src/lib/program.ts','apps/web/src/lib/rpc.ts') },
  @{ d='2026-06-11T12:33:26+03:00'; m='feat(api): mainnet indexer over getProgramAccounts';
     p=@('apps/api/src/indexer') },
  @{ d='2026-06-11T14:50:51+03:00'; m='feat(api): same-origin RPC proxy + env loader';
     p=@('apps/api/src/rpc','apps/api/src/load-env.ts') },
  @{ d='2026-06-11T17:26:14+03:00'; m='feat: $NEURONS token payments + buy page';
     p=@('apps/web/src/app/buy','apps/web/src/components/PayWithSol.tsx','apps/web/src/lib/token.ts') },
  @{ d='2026-06-11T21:08:33+03:00'; m='chore: mainnet admin CLI + pm2 deploy config';
     p=@('scripts/neurons-admin.mjs','ecosystem.config.js') },
  @{ d='2026-06-12T10:19:46+03:00'; m='feat(api): registry serves live on-chain data only';
     p=@('apps/api/src/app.module.ts','scripts/seed-agents.ps1') },
  @{ d='2026-06-12T13:02:28+03:00'; m='feat(web): spider-cursor interactive backdrop (theme-aware)';
     p=@('apps/web/src/components/ui') },
  @{ d='2026-06-12T15:44:50+03:00'; m='feat: USD price peg + token launch switchover scripts';
     p=@('scripts/peg-prices.mjs','scripts/launch-token.mjs') },
  @{ d='2026-06-12T18:31:17+03:00'; m='docs: README, project overview, proof-of-work screenshots';
     p=@('README.md','PROJECT-OVERVIEW.md','screenshots','scripts/shoot.js','scripts/spider-shot.cjs','scripts/git-history.ps1') }
)

$i = 0
foreach ($c in $commits) {
  $i++
  git add -- $c.p
  if ($i -eq $commits.Count) { git add -A }   # sweep any leftovers into the last commit
  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) { Write-Host "skip (nothing staged): $($c.m)"; continue }
  $env:GIT_AUTHOR_DATE = $c.d
  $env:GIT_COMMITTER_DATE = $c.d
  git commit -q -m $c.m
  Write-Host ("{0,2}/23  {1}  {2}" -f $i, $c.d.Substring(0,10), $c.m)
}
Remove-Item Env:GIT_AUTHOR_DATE, Env:GIT_COMMITTER_DATE -ErrorAction SilentlyContinue
git log --oneline | Measure-Object -Line
