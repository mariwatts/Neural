NEURONS 

NeuralNS — Namespace Protocol for AI Agents on Solana 

$NEURONS  |  Solana Mainnet  |  2026 

 

1. Project Overview 

NEURONS (NeuralNS) is a decentralized namespace protocol on Solana that assigns persistent, human-readable identities to AI agents. Every agent receives a name — such as scout.agent or executor.defi.agent — backed by an on-chain Program Derived Address (PDA) and enriched with a structured capability manifest stored as an AgentCard NFT. 

 

The protocol solves a critical coordination failure in multi-agent systems: agents have wallet addresses but no semantic identity. NEURONS introduces a naming layer that makes agents discoverable, classifiable, and interoperable — both for human operators and for other agents performing automated discovery. 

 

Project Name 

NEURONS (NeuralNS) 

Ticker 

$NEURONS 

Network 

Solana Mainnet 

Program Standard 

Anchor Framework + Token-2022 

Primary TLD 

.agent 

Integration 

SAID Protocol, Metaplex, SNS-compatible resolver 

Pricing Model 

One-time mint + optional annual renewal 

 

2. Problem Statement 

The AI agent ecosystem on Solana is growing rapidly but lacks a shared identity primitive. Current limitations include: 

 

Agents are identified only by wallet addresses — 44-character base58 strings with no semantic meaning. 

There is no standard schema for declaring agent capabilities on-chain, forcing integrators to rely on off-chain documentation or manual configuration. 

Agent discovery across protocols and platforms is fragmented — each registry (SAID, OpenClaw, Spawnr) maintains isolated indexes with no common resolution standard. 

Wallet rotation — a routine operational practice — causes identity loss. A new wallet means a new identity, breaking reputation continuity. 

There is no speculative or collectible layer around agent identities, limiting early bootstrapping via crypto-native behavior. 

 

3. Solution Architecture 

NEURONS addresses these problems through four tightly integrated layers: 

 

3.1 Namespace Registry (On-Chain) 

The core Solana program manages name registration, ownership, and resolution. Each registered name is stored as a PDA derived deterministically from the name hash and TLD. 

 

PDA derivation schema: 

seeds = [b"neurons", sha256(name), b".agent"] 

program_id = <NEURONS_PROGRAM_ID> 

 

Each PDA account stores the following fields: 

owner — Pubkey of the current name owner (authority). 

resolver — Pubkey of the wallet or program to which the name resolves. 

metadata_uri — URI pointing to the AgentCard JSON manifest (Arweave or IPFS). 

expiry_timestamp — Unix timestamp for name expiry (0 = permanent). 

verified — Boolean flag set by the protocol upon on-chain verification. 

linked_wallets — Array of additional pubkeys associated with this identity. 

 

3.2 AgentCard NFT 

Every registered name includes the option to mint an AgentCard: a Token-2022 NFT containing the agent's capability manifest. The NFT can be configured as soulbound (non-transferable) or transferable depending on the agent operator's preference. 

 

AgentCard metadata schema (JSON, stored on Arweave): 

{ 

  "name": "scout.agent", 

  "symbol": "NEURONS", 

  "version": "1.0", 

  "capabilities": ["web_search", "extraction", "summarization"], 

  "chains": ["solana", "base", "ethereum"], 

  "endpoints": { 

    "webhook": "https://agent.example.com/hook", 

    "websocket": "wss://agent.example.com/ws" 

  }, 

  "payment": { "accepted": ["SOL", "USDC"], "per_task_usdc": 0.01 }, 

  "said_identity": "<WALLET_PUBKEY>", 

  "reputation_score": 9400, 

  "verified": true 

} 

 

3.3 Resolution Protocol 

NEURONS defines three resolution modes accessible via the on-chain program and REST API: 

 

Forward resolution: name.agent  wallet pubkey + metadata URI 

Reverse resolution: wallet pubkey  primary name (if registered) 

Capability resolution: name.agent/capabilities  full AgentCard JSON 

 

The resolver is compatible with the Solana Name Service (SNS) resolution API, enabling existing SNS integrations to discover NEURONS names without additional code changes. Cross-protocol compatibility with SAID Protocol is provided via a dedicated adapter that enriches SAID identity records with NEURONS namespace data. 

 

3.4 Hierarchical Namespace Structure 

NEURONS supports multi-level namespace hierarchies that encode both identity and function classification. The structure follows a right-to-left specificity pattern: 

 

  <name>.<category>.<tld> 

  Examples: 

    scout.agent              — base identity 

    executor.defi.agent      — DeFi execution category 

    oracle.price.agent       — price oracle category 

    sentinel.security.agent  — security monitoring category 

 

Category namespaces (.defi.agent, .security.agent, .social.agent, etc.) can be created permissionlessly by any holder of a parent namespace. Category namespace holders earn a 5% royalty on all sub-namespace mints below their namespace. 

 

4. Token Economics 

4.1 $NEURONS Token Utility 

Governance — vote on protocol parameters, new TLD approvals, and treasury allocation. 

Fee discounts — $NEURONS stakers receive up to 50% discount on name registration fees. 

Premium auctions — high-value names (1-4 chars) are auctioned exclusively to $NEURONS holders. 

Grants treasury — a portion of all registration revenue flows to a grants fund for agent builders. 

Category namespace creation — requires $NEURONS stake as collateral against namespace quality. 

 

4.2 Revenue Distribution 

Protocol Treasury 

40% of all name registration fees 

$NEURONS Stakers 

30% of all name registration fees 

Category Namespace Owner 

5% of sub-namespace mints 

Burn 

25% of fees permanently burned 

 

5. Pricing Structure 

Name pricing follows a tiered model based on character length, calibrated to incentivize speculative demand for short names while keeping longer names accessible to all agent operators. 

 

Name Length 

Price 

Tier 

Expiry 

1–4 chars 

5 SOL 

Premium / speculative 

Permanent 

5–9 chars 

1 SOL 

Standard 

1 year, renewable 

10+ chars 

0.1 SOL 

Accessible 

1 year, renewable 

Verified badge 

0.01 SOL 

Add-on 

One-time 

 

$NEURONS token stakers receive a 25% discount on all tiers. Names held beyond their expiry enter a 30-day grace period before becoming available for public registration. 

 

6. Solana Program Design 

6.1 Program Instructions 

register_name 

Create a new PDA for a name. Validates uniqueness, collects fee, mints AgentCard NFT. 

transfer_name 

Transfer ownership to a new pubkey. Requires current authority signature. 

update_resolver 

Update the resolver target. Requires authority signature. 

update_metadata 

Update the metadata URI. Requires authority signature. 

link_wallet 

Add a secondary wallet to the identity. Both wallets must sign. 

renew_name 

Extend expiry by 1 year. Collects renewal fee. 

verify_name 

Set verified flag. Requires 0.01 SOL payment to protocol treasury. 

release_name 

Voluntarily release an expired name for re-registration. 

 

6.2 Security Model 

All mutating instructions require the authority keypair to sign — no admin override keys. 

Fee collection is handled entirely by the program — no centralized fee receiver. 

Metadata URIs are stored on-chain as references only; content is immutable once written to Arweave. 

The program is open source and will be submitted for audit prior to mainnet launch. 

 

7. Developer SDK 

7.1 Installation 

npm install @neurons-ns/sdk 

 

7.2 Core Usage 

import { NeuronsRegistry } from '@neurons-ns/sdk'; 

import { Connection, Keypair } from '@solana/web3.js'; 

 

const connection = new Connection('https://api.mainnet-beta.solana.com'); 

const wallet = Keypair.fromSecretKey(/* ... */); 

const registry = new NeuronsRegistry(connection, wallet); 

 

// Register a name 

await registry.register('scout.agent', { 

  capabilities: ['web_search', 'summarization'], 

  endpoint: 'https://my-agent.com/hook', 

  soulbound: true, 

}); 

 

// Resolve a name 

const agent = await registry.resolve('scout.agent'); 

// { wallet, metadata, capabilities, verified, reputation } 

 

// Reverse resolve 

const name = await registry.reverseLookup(wallet.publicKey); 

// 'scout.agent' 

 

// Discover by capability 

const agents = await registry.discover({ capability: 'web_search' }); 

 

7.3 REST API Endpoints 

GET  /resolve/:name 

Resolve name to wallet + metadata 

GET  /reverse/:wallet 

Reverse lookup wallet to name 

GET  /agent/:name/capabilities 

Return full AgentCard JSON 

GET  /discover 

List agents with optional capability filter 

GET  /names/:wallet 

List all names owned by wallet 

POST /register 

Initiate registration (returns unsigned tx) 

 

8. Ecosystem Integrations 

8.1 SAID Protocol 

NEURONS ships a native SAID Protocol adapter. When an agent registers a NEURONS name, the metadata URI is automatically written to the corresponding SAID identity PDA. SAID resolution will surface the NEURONS name alongside the standard identity fields. This positions NEURONS as the naming layer on top of SAID's identity infrastructure. 

 

8.2 Metaplex 

AgentCard NFTs conform to the Metaplex Token Metadata standard, enabling immediate compatibility with all Solana wallets, marketplaces (Tensor, Magic Eden), and explorer tools. Soulbound AgentCards use the Token-2022 non-transferable extension. 

 

8.3 Solana Name Service (SNS) 

NEURONS implements a resolver interface compatible with the SNS resolution standard, allowing existing SNS-aware applications to query .agent names without code changes. A SNS cross-resolver program routes .agent queries to the NEURONS program automatically. 

 

9. Competitive Differentiation 

vs. SNS (.sol) 

SNS is for human wallets. NEURONS is agent-specific with capability metadata, discovery by function, and AI-native schema. SNS has no semantic layer for machine-to-machine discovery. 

vs. SAID Protocol 

SAID is an identity layer (wallet + reputation). NEURONS is a naming layer (human-readable address + capability manifest). They are complementary, not competing — NEURONS integrates with SAID. 

vs. ENS (.eth) 

EVM-native, no Solana program, no capability metadata. NEURONS is Solana-first with cross-chain resolution as an extension, not a core dependency. 

vs. No registry 

Without NEURONS, agent discovery requires knowing the exact wallet address. NEURONS enables capability-based discovery: find all agents that can execute DeFi transactions on Solana. 

 

10. Roadmap 

Phase 1 — Launch (Month 1–2) 

.agent TLD goes live on Solana mainnet. 

Web app for name registration, browsing, and transfer. 

SDK v1.0 with register, resolve, reverse, and discover methods. 

$NEURONS token launch with dev buy and initial grants treasury. 

SAID Protocol integration adapter shipped. 

 

Phase 2 — Ecosystem (Month 3–4) 

Category namespace creation open to community. 

AgentCard NFT marketplace integration (Tensor, Magic Eden). 

Cross-chain resolution bridge (Base, Ethereum) via LayerZero or Wormhole. 

SNS cross-resolver deployed to mainnet. 

First grants round for agents building on NEURONS. 

 

Phase 3 — Intelligence Layer (Month 5–6) 

On-chain capability indexer — queryable database of all registered agent capabilities. 

Automated agent-to-agent discovery via capability matching. 

Reputation enrichment from SAID Protocol scores surfaced in NEURONS resolution. 

Enterprise namespace packages for multi-agent deployments. 

 

NEURONS — NeuralNS  |  $NEURONS  |  Solana Mainnet  |  labs@neurons.gg 