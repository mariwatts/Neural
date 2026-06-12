# Seed a small set of REAL on-chain agents (run once). Each entry is a genuine
# mainnet registration from the deployer wallet - no simulation.
$ErrorActionPreference = 'Continue'
$api = 'http://localhost:4000/api'
$owner = '8AQFyZvs9pQAxFaBYcRdJXHNpR8vFkUxQahRdrHzsDvN'

$agents = @(
  @{ label = 'scout';        category = 'research'; verify = $true;  card = $true  },
  @{ label = 'executor';     category = 'defi';     verify = $true;  card = $true  },
  @{ label = 'sentinel';     category = 'security'; verify = $true;  card = $true  },
  @{ label = 'pricefeed';    category = 'oracle';   verify = $true;  card = $false },
  @{ label = 'archivist';    category = 'data';     verify = $false; card = $false },
  @{ label = 'broker';       category = 'trading';  verify = $true;  card = $true  },
  @{ label = 'herald';       category = 'social';   verify = $false; card = $false },
  @{ label = 'forgemaster';  category = 'infra';    verify = $false; card = $false },
  @{ label = 'curator';      category = 'nft';      verify = $false; card = $false },
  @{ label = 'delegate';     category = 'dao';      verify = $true;  card = $false }
)

foreach ($a in $agents) {
  $name = "$($a.label).$($a.category).agent"
  Write-Host "=== $name ===" -ForegroundColor Cyan

  # 1) store the AgentCard manifest off-chain first (capabilities enrichment)
  $body = @{ label = $a.label; category = $a.category; owner = $owner } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Post "$api/register" -ContentType 'application/json' -Body $body -TimeoutSec 15 | Out-Null
    Write-Host "  manifest stored"
  } catch { Write-Host "  manifest skip: $($_.Exception.Message)" }

  # 2) real on-chain registration
  node scripts\neurons-admin.mjs register $name
  if ($LASTEXITCODE -ne 0) { Write-Host "  REGISTER FAILED" -ForegroundColor Red; continue }

  if ($a.card) {
    node scripts\neurons-admin.mjs mint-card $name --soulbound
  }
  if ($a.verify) {
    node scripts\neurons-admin.mjs verify-name $name
  }
}

Invoke-RestMethod -Method Post "$api/index/refresh" -TimeoutSec 30 | Out-Null
Write-Host "done - index refreshed" -ForegroundColor Green
