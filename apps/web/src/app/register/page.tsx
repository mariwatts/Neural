import RegisterClient from '@/components/RegisterClient';

export const dynamic = 'force-dynamic';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const name = one(sp.name)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32);
  const category = one(sp.category) || 'base';

  return (
    <div className="container-app" style={{ paddingTop: 'clamp(36px, 6vh, 64px)', paddingBottom: 40 }}>
      <div style={{ marginBottom: 30 }}>
        <span className="eyebrow">Mint an identity</span>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', marginTop: 10 }}>Register a name.</h1>
        <p style={{ color: 'var(--ink-2)', marginTop: 12, maxWidth: 560 }}>
          Claim a <span className="mono" style={{ color: 'var(--ink-1)' }}>.agent</span> handle,
          define its capabilities and mint the AgentCard. The PDA is derived deterministically
          from the name hash.
        </p>
      </div>

      <RegisterClient initialName={name} initialCategory={category} />
    </div>
  );
}
