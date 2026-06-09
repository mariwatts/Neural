import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import type { AgentDetail } from '@/lib/types';
import { categoryMeta } from '@/lib/categories';
import { compact, rep, short, timeAgo, ACTIVITY_GLYPH, ACTIVITY_LABEL } from '@/lib/format';
import AgentAvatar from '@/components/AgentAvatar';
import Handle from '@/components/Handle';
import Copyable from '@/components/Copyable';

export const dynamic = 'force-dynamic';

export default async function AgentPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);

  let agent: AgentDetail;
  try {
    agent = await api.agent(decoded);
  } catch {
    notFound();
  }

  const cat = categoryMeta(agent.category);
  const expiry =
    agent.expiryTimestamp === 0
      ? 'Permanent'
      : new Date(agent.expiryTimestamp * 1000).toISOString().slice(0, 10);

  return (
    <div className="container-app" style={{ paddingTop: 'clamp(28px, 5vh, 48px)', paddingBottom: 40 }}>
      <Link href="/explore" data-hot className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
        ← back to registry
      </Link>

      {/* header */}
      <div
        className="panel"
        style={{
          marginTop: 16,
          padding: 'clamp(20px, 3vw, 30px)',
          display: 'flex',
          gap: 22,
          alignItems: 'center',
          flexWrap: 'wrap',
          background:
            'radial-gradient(120% 200% at 0% 0%, rgba(31,91,230,0.07), transparent 55%), var(--color-bg-1)',
        }}
      >
        <AgentAvatar seed={agent.card.avatarSeed} category={agent.category} size={84} rounded={18} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Handle name={agent.name} size={28} />
            {agent.verified && (
              <span className="chip chip-active">✓ verified</span>
            )}
            <span className="chip" style={{ color: cat.color }}>
              {cat.glyph} {cat.label}
            </span>
            <span className="chip">{agent.tier}</span>
          </div>
          <p style={{ color: 'var(--ink-1)', marginTop: 12, fontSize: 14.5, maxWidth: 620 }}>
            {agent.card.description}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 26 }}>
          <BigStat label="reputation" value={rep(agent.card.reputationScore)} accent />
          <BigStat label="tasks served" value={compact(agent.tasksServed)} />
        </div>
      </div>

      {/* body */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 18, marginTop: 18 }} className="agent-grid">
        {/* left */}
        <div style={{ display: 'grid', gap: 18 }}>
          {/* capabilities */}
          <Card title="Capability manifest">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {agent.card.capabilities.map((c) => (
                <span key={c} className="mono" style={{ fontSize: 12.5, color: 'var(--ink-0)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 7, padding: '6px 11px' }}>
                  {c}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {agent.card.chains.map((ch) => (
                <span key={ch} className="chip">{ch}</span>
              ))}
            </div>
          </Card>

          {/* on-chain record */}
          <Card title="On-chain record (PDA)">
            <KV k="PDA" v={<Copyable value={agent.pda} />} />
            <KV k="Owner" v={<Copyable value={agent.owner} />} />
            <KV k="Resolver" v={<Copyable value={agent.resolver} />} />
            <KV k="SAID identity" v={<Copyable value={agent.card.saidIdentity} />} />
            <KV k="Name hash" v={<Copyable value={agent.nameHash} display={`${agent.nameHash.slice(0, 10)}…`} />} />
            <KV k="Metadata URI" v={<Copyable value={agent.metadataUri} truncate={false} />} />
            <KV k="AgentCard mint" v={<Copyable value={agent.card.mint} />} />
            <KV k="Expiry" v={<span className="mono">{expiry}</span>} />
            <KV k="Soulbound" v={<span className="mono">{agent.card.soulbound ? 'true' : 'false'}</span>} />
            {agent.linkedWallets.length > 0 && (
              <KV
                k="Linked wallets"
                v={
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    {agent.linkedWallets.map((w) => (
                      <Copyable key={w} value={w} />
                    ))}
                  </span>
                }
              />
            )}
          </Card>

          {/* endpoints + payment */}
          <Card title="Endpoints & payment">
            <KV k="Webhook" v={<span className="mono" style={{ fontSize: 12, color: 'var(--ink-1)' }}>{agent.card.endpoints.webhook}</span>} />
            <KV k="WebSocket" v={<span className="mono" style={{ fontSize: 12, color: 'var(--ink-1)' }}>{agent.card.endpoints.websocket}</span>} />
            <KV k="Accepts" v={<span className="mono">{agent.card.payment.accepted.join(' · ')}</span>} />
            <KV k="Per task" v={<span className="mono tnum">${agent.card.payment.perTaskUsdc} USDC</span>} />
          </Card>
        </div>

        {/* right */}
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          {/* resolve snippet */}
          <Card title="Resolve">
            <pre className="mono" style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-1)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
{`GET /resolve/${agent.name}

→ owner   ${short(agent.owner, 6, 6)}
→ rep     ${rep(agent.card.reputationScore)}
→ caps    ${agent.card.capabilities.length}
→ verified ${agent.verified}`}
            </pre>
          </Card>

          {/* history */}
          <Card title="Recent activity">
            {agent.history.length === 0 ? (
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>No recent events.</span>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                {agent.history.slice(0, 8).map((e) => (
                  <li key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ color: cat.color, width: 16 }}>{ACTIVITY_GLYPH[e.type] ?? '·'}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-1)', flex: 1 }}>{ACTIVITY_LABEL[e.type] ?? e.type}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{timeAgo(e.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* siblings */}
          {agent.siblings.length > 0 && (
            <Card title={`More in ${cat.label}`}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {agent.siblings.map((s) => (
                  <li key={s.name}>
                    <Link href={`/agent/${s.name}`} data-hot style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <Handle name={s.name} size={12.5} />
                      <span className="mono tnum" style={{ fontSize: 11, color: 'var(--accent)' }}>{rep(s.reputationScore)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <style>{`@media (max-width: 880px){ .agent-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid rgba(35,42,48,0.5)' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{k}</span>
      <span style={{ textAlign: 'right', minWidth: 0, fontSize: 13 }}>{v}</span>
    </div>
  );
}

function BigStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="mono tnum" style={{ fontSize: 26, color: accent ? 'var(--accent-bright)' : 'var(--ink-0)' }}>{value}</div>
      <div className="eyebrow" style={{ marginTop: 4 }}>{label}</div>
    </div>
  );
}
