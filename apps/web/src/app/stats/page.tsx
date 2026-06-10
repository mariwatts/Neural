import { api } from '@/lib/api';
import type { ActivityEvent, ProtocolStats, TimelinePoint } from '@/lib/types';
import StatsClient from '@/components/StatsClient';
import ActivityFeed from '@/components/ActivityFeed';

export const dynamic = 'force-dynamic';

async function safe<T>(p: Promise<T>, fb: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fb;
  }
}

export default async function StatsPage() {
  const [stats, timeline, activity] = await Promise.all([
    safe<ProtocolStats | null>(api.stats(), null),
    safe<TimelinePoint[]>(api.timeline(30), []),
    safe<ActivityEvent[]>(api.activity(20), []),
  ]);

  return (
    <div className="container-app" style={{ paddingTop: 'clamp(36px, 6vh, 64px)', paddingBottom: 40 }}>
      <div style={{ marginBottom: 26 }}>
        <span className="eyebrow">Network telemetry</span>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', marginTop: 10 }}>Protocol stats.</h1>
        <p style={{ color: 'var(--ink-2)', marginTop: 12, maxWidth: 560 }}>
          Live metrics for the NeuralNS registry — registrations, reputation, task
          throughput and the on-chain revenue split. Updates every few seconds.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }} className="stats-grid">
        <StatsClient initialStats={stats} initialTimeline={timeline} />
        <ActivityFeed initial={activity} limit={16} title="Live event stream" />
      </div>

      <style>{`@media (max-width: 980px){ .stats-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}
