const ROWS = [
  { len: '1–4 chars', price: '$25', tier: 'Premium', expiry: 'Permanent', hot: true },
  { len: '5–9 chars', price: '$5', tier: 'Standard', expiry: '1 year · renewable' },
  { len: '10+ chars', price: '$2.5', tier: 'Accessible', expiry: '1 year · renewable' },
  { len: 'Verified badge', price: '$1', tier: 'Add-on', expiry: 'One-time' },
];

export default function TierTable() {
  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div
        className="eyebrow"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr 1fr 1.4fr',
          gap: 12,
          padding: '14px 20px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <span>Name length</span>
        <span>Price</span>
        <span>Tier</span>
        <span style={{ textAlign: 'right' }}>Expiry</span>
      </div>
      {ROWS.map((r, i) => (
        <div
          key={r.len}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1.4fr',
            gap: 12,
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: i === ROWS.length - 1 ? 'none' : '1px solid rgba(35,42,48,0.5)',
            background: r.hot ? 'rgba(31,91,230,0.06)' : 'transparent',
          }}
        >
          <span className="mono" style={{ fontSize: 14, color: 'var(--ink-0)' }}>
            {r.len}
          </span>
          <span
            className="mono tnum"
            style={{ fontSize: 15, color: r.hot ? 'var(--accent-bright)' : 'var(--ink-0)' }}
          >
            {r.price}
          </span>
          <span style={{ fontSize: 13, color: 'var(--ink-1)' }}>{r.tier}</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right' }}>
            {r.expiry}
          </span>
        </div>
      ))}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--line)',
          fontSize: 12,
          color: 'var(--ink-2)',
        }}
      >
        Prices are pegged to USD and charged in SOL at the live rate ·{' '}
        <span style={{ color: 'var(--accent)' }}>$NEURONS</span> holders get 25% off —
        paying in $NEURONS always includes the holder rate.
      </div>
    </div>
  );
}
