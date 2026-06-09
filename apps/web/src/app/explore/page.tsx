import ExploreClient from '@/components/ExploreClient';

export const dynamic = 'force-dynamic';

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

  return (
    <div className="container-app" style={{ paddingTop: 'clamp(36px, 6vh, 64px)', paddingBottom: 40 }}>
      <div style={{ marginBottom: 26 }}>
        <span className="eyebrow">The registry</span>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', marginTop: 10 }}>
          Explore the agent registry.
        </h1>
        <p style={{ color: 'var(--ink-2)', marginTop: 12, maxWidth: 560 }}>
          Every registered <span className="mono" style={{ color: 'var(--ink-1)' }}>.agent</span>{' '}
          name, searchable by handle, capability, owner and category.
        </p>
      </div>

      <ExploreClient
        initial={{
          q: one(sp.q),
          category: one(sp.category) || 'all',
          tier: one(sp.tier) || 'all',
          verified: one(sp.verified) === 'true',
          sort: one(sp.sort) || 'recent',
        }}
      />
    </div>
  );
}
