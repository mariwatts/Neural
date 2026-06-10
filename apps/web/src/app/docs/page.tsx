import Link from 'next/link';

export const metadata = {
  title: 'Docs & SDK — NEURONS NeuralNS',
};

const PROGRAM = '5dqCWiZvLWD1Nge15UhXyGCGd2rF8uN6nPigdnLRWCv1';

const NAV = [
  ['overview', 'Overview'],
  ['program', 'Program'],
  ['install', 'Install'],
  ['resolve', 'Resolve'],
  ['register', 'Register'],
  ['record', 'On-chain record'],
  ['instructions', 'Instructions'],
  ['data', 'Data source'],
  ['roadmap', 'Roadmap'],
];

export default function DocsPage() {
  return (
    <div className="container-app" style={{ paddingTop: 'clamp(36px, 6vh, 56px)', paddingBottom: 60 }}>
      <div style={{ marginBottom: 30 }}>
        <span className="eyebrow">Developers</span>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', marginTop: 10 }}>Docs &amp; SDK.</h1>
        <p style={{ color: 'var(--ink-2)', marginTop: 12, maxWidth: 600 }}>
          The <span className="mono" style={{ color: 'var(--ink-1)' }}>.agent</span> registry
          is a native Solana program live on mainnet. Interact with it directly using{' '}
          <span className="mono" style={{ color: 'var(--ink-1)' }}>@solana/web3.js</span> — no
          custom SDK required.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0,1fr)', gap: 40, alignItems: 'start' }} className="docs-grid">
        <nav style={{ position: 'sticky', top: 108, display: 'grid', gap: 4 }} className="docs-nav">
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} data-hot className="mono docs-link" style={{ fontSize: 12.5, color: 'var(--ink-2)', padding: '7px 10px', borderRadius: 7 }}>
              {label}
            </a>
          ))}
        </nav>

        <div style={{ display: 'grid', gap: 44, maxWidth: 760 }}>
          <Section id="overview" title="Overview">
            <P>
              NEURONS (NeuralNS) is a namespace protocol on Solana that assigns persistent,
              human-readable identities to AI agents. Each name is a Program Derived Address
              (PDA) storing its owner, resolver, expiry, verified flag, AgentCard NFT mint and
              metadata URI on chain.
            </P>
            <P>
              PDA derivation is <Code>{'[ "name", sha256(name) ]'}</Code>. Forward resolution is
              simply &quot;derive the PDA and read the account&quot; — no indexer needed. All
              protocol economics (tier prices, payment token, treasury) live in a config PDA{' '}
              <Code>{'[ "config" ]'}</Code> readable by anyone.
            </P>
          </Section>

          <Section id="program" title="Program">
            <P>The program is deployed on Solana mainnet-beta:</P>
            <div className="panel" style={{ padding: 16 }}>
              <KV k="Program ID" v={PROGRAM} />
              <KV k="Loader" v="BPFLoaderUpgradeable" />
              <KV k="Standard" v="Native Solana (no Anchor) + Token-2022 AgentCards" />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              <Ext href={`https://explorer.solana.com/address/${PROGRAM}`}>Explorer ↗</Ext>
              <Ext href={`https://solscan.io/account/${PROGRAM}`}>Solscan ↗</Ext>
              <Ext href={`https://xray.helius.xyz/account/${PROGRAM}?network=mainnet`}>XRAY ↗</Ext>
            </div>
          </Section>

          <Section id="install" title="Install">
            <P>One real dependency — everything else lives in the program repo.</P>
            <Block>npm install @solana/web3.js</Block>
          </Section>

          <Section id="resolve" title="Resolve a name (read on-chain)">
            <P>Derive the PDA, read the account, decode the fields. This works today against mainnet.</P>
            <Block>{`import { Connection, PublicKey } from '@solana/web3.js';
import { createHash } from 'node:crypto';

const PROGRAM_ID = new PublicKey('${PROGRAM}');
const conn = new Connection('https://api.mainnet-beta.solana.com');

function namePda(name) {
  const hash = createHash('sha256').update(name).digest();
  return PublicKey.findProgramAddressSync(
    [Buffer.from('name'), hash], PROGRAM_ID,
  )[0];
}

const pda = namePda('neuralns.agent');
const acc = await conn.getAccountInfo(pda);
if (!acc) throw new Error('not registered');

const d = acc.data;            // layout below (§ On-chain record)
const owner    = new PublicKey(d.subarray(2, 34));
const resolver = new PublicKey(d.subarray(34, 66));
const expiry   = d.readBigInt64LE(66);     // 0 = permanent
const verified = d[74] === 1;
const cardMint = new PublicKey(d.subarray(75, 107));
const nameLen  = d.readUInt32LE(107);
const name     = d.subarray(111, 111 + nameLen).toString('utf8');
const uriLen   = d.readUInt32LE(111 + nameLen);
const uri      = d.subarray(115 + nameLen, 115 + nameLen + uriLen).toString('utf8');

console.log({ name, owner: owner.toBase58(), verified, expiry, uri });`}</Block>
          </Section>

          <Section id="register" title="Register a name (send a tx)">
            <P>
              Build the <Code>Register</Code> instruction (Borsh) and sign it with the payer /
              connected wallet. The treasury and prices are read from the config PDA.
            </P>
            <Block>{`// Borsh: variant 0 + name(string) + resolver(pubkey) + years(u32) + metadata_uri(string)
function encodeRegister(name, resolver, years, uri) {
  const s = (str) => {
    const b = Buffer.from(str, 'utf8');
    const len = Buffer.alloc(4); len.writeUInt32LE(b.length);
    return Buffer.concat([len, b]);
  };
  const yr = Buffer.alloc(4); yr.writeUInt32LE(years);
  return Buffer.concat([Buffer.from([0]), s(name), resolver.toBuffer(), yr, s(uri)]);
}

const CONFIG = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)[0];
// treasury = bytes 34..66 of the config account
const cfg = await conn.getAccountInfo(CONFIG);
const TREASURY = new PublicKey(cfg.data.subarray(34, 66));

const ix = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: payer.publicKey, isSigner: true,  isWritable: true },  // payer
    { pubkey: namePda(name),   isSigner: false, isWritable: true },  // record PDA
    { pubkey: CONFIG,          isSigner: false, isWritable: false }, // config PDA
    { pubkey: TREASURY,        isSigner: false, isWritable: true },  // fee receiver
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  data: encodeRegister(name, payer.publicKey, 1, 'https://neuralns.xyz/api/agent/' + name + '/card.json'),
});
await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer]);`}</Block>
          </Section>

          <Section id="record" title="On-chain record layout">
            <P>Each name PDA stores exactly these bytes (Borsh):</P>
            <Block>{`offset   size field
0        1    version (u8 = 2)
1        1    bump (u8)
2        32   owner (Pubkey)
34       32   resolver (Pubkey)
66       8    expiry (i64, unix seconds; 0 = permanent)
74       1    verified (u8)
75       32   card_mint (Pubkey; zeroes = no AgentCard yet)
107      4+N  name (string: u32 len + utf8 bytes)
111+N    4+M  metadata_uri (string: u32 len + utf8 bytes)`}</Block>
            <P>
              The AgentCard is a Token-2022 NFT minted at PDA{' '}
              <Code>{'[ "card", sha256(name) ]'}</Code> with the token-metadata extension
              (name, symbol, URI) and an optional non-transferable (soulbound) extension.
            </P>
          </Section>

          <Section id="instructions" title="Program instructions">
            <Endpoints
              rows={[
                ['IX', 'Register { name, resolver, years, metadata_uri }', 'Create the PDA, pay the tiered SOL fee; optional holder discount'],
                ['IX', 'RegisterWithToken { … }', 'Same, fee paid in the configured token (Token-2022 transfer_checked)'],
                ['IX', 'UpdateResolver { resolver }', 'Repoint resolution (owner signs)'],
                ['IX', 'Transfer { new_owner }', 'Change owner (owner signs)'],
                ['IX', 'Renew { years }', 'Extend expiry, pay the tiered fee'],
                ['IX', 'UpdateMetadata { uri }', 'Set the AgentCard manifest URI (owner signs)'],
                ['IX', 'MintAgentCard { soulbound }', 'Mint the AgentCard as a Token-2022 NFT to the owner wallet'],
                ['IX', 'Verify', 'Owner pays the verify fee — verified flag set on-chain'],
                ['IX', 'InitConfig / UpdateConfig', 'Admin-managed economics: prices, payment token, treasury, pause'],
              ]}
            />
          </Section>

          <Section id="data" title="Data source">
            <div className="panel" style={{ padding: 16 }}>
              <P>
                Everything on this site is <strong>live on-chain data</strong>: the REST endpoints
                (<span className="mono">/api/explore</span>, <span className="mono">/api/stats</span>,{' '}
                <span className="mono">/api/resolve</span>…) are served by an indexer that reads the
                program&apos;s accounts on Solana mainnet via{' '}
                <span className="mono">getProgramAccounts</span>. Forward resolution can also be
                done trustlessly without our API — derive the PDA and read it (see Resolve above).
              </P>
            </div>
          </Section>

          <Section id="roadmap" title="Roadmap">
            <Endpoints
              rows={[
                ['NEXT', 'SDK v1.0 on npm', '@neurons-ns/sdk — register, resolve, reverse, discover'],
                ['NEXT', 'Integrations', 'SAID Protocol · SNS cross-resolver · marketplace listings'],
                ['NEXT', 'Category namespaces', 'Community-owned .defi / .security / .oracle namespaces with royalties'],
                ['NEXT', 'Security audit', 'Independent program audit before fee-scale-up'],
              ]}
            />
          </Section>

          <div className="panel" style={{ padding: 26, textAlign: 'center', marginTop: 8 }}>
            <h3 style={{ fontSize: 22 }}>Claim a name on mainnet</h3>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
              <Link href="/register" className="btn btn-primary" data-hot>Register a name</Link>
              <Link href="/explore" className="btn btn-ghost" data-hot>Explore the registry</Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .docs-link:hover { color: var(--ink-0); background: var(--bg-1); }
        @media (max-width: 820px){ .docs-grid{ grid-template-columns:1fr !important; } .docs-nav{ display:none !important; } }
      `}</style>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 116 }}>
      <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', marginBottom: 16 }}>{title}</h2>
      <div style={{ display: 'grid', gap: 14 }}>{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: 'var(--ink-1)', fontSize: 14.5, lineHeight: 1.7 }}>{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="mono" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 5, padding: '2px 6px', fontSize: 12.5, color: 'var(--accent)' }}>
      {children}
    </code>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <pre className="panel mono" style={{ padding: 18, margin: 0, overflowX: 'auto', fontSize: 12.5, lineHeight: 1.7, color: 'var(--ink-1)', background: 'var(--color-bg-2)' }}>
      {children}
    </pre>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '7px 0', borderBottom: '1px solid rgba(216,212,200,0.6)' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{k}</span>
      <span className="mono" style={{ fontSize: 12.5, color: 'var(--ink-0)', wordBreak: 'break-all', textAlign: 'right' }}>{v}</span>
    </div>
  );
}

function Ext({ href, children, button }: { href: string; children: React.ReactNode; button?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-hot
      className={button ? 'btn btn-ghost' : 'mono'}
      style={button ? undefined : { fontSize: 12.5, color: 'var(--accent)', borderBottom: '1px solid var(--accent-deep)' }}
    >
      {children}
    </a>
  );
}

function Endpoints({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <div key={r[1]} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 12, padding: '12px 16px', borderBottom: i === rows.length - 1 ? 'none' : '1px solid rgba(216,212,200,0.6)', alignItems: 'baseline' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--accent)', border: '1px solid var(--accent-deep)', borderRadius: 4, padding: '2px 0', textAlign: 'center', background: 'rgba(31,91,230,0.08)' }}>{r[0]}</span>
          <div>
            <div className="mono" style={{ fontSize: 13, color: 'var(--ink-0)' }}>{r[1]}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 3 }}>{r[2]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
