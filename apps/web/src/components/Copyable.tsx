'use client';

import { useState } from 'react';
import { short } from '@/lib/format';

export default function Copyable({
  value,
  display,
  truncate = true,
  className = '',
}: {
  value: string;
  display?: string;
  truncate?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const label = display ?? (truncate ? short(value, 6, 6) : value);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1100);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <button
      onClick={copy}
      data-hot
      className={`mono ${className}`}
      title={`Copy ${value}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        border: 'none',
        color: copied ? 'var(--accent-bright)' : 'inherit',
        cursor: 'pointer',
        fontSize: 'inherit',
        padding: 0,
        transition: 'color 0.15s',
      }}
    >
      {copied ? 'copied' : label}
      <span style={{ opacity: 0.5, fontSize: '0.85em' }}>{copied ? '✓' : '⧉'}</span>
    </button>
  );
}
