'use client';

import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { NameRecord } from '@/lib/types';

const PAGES = [
  { label: 'Home', path: '/', kw: 'home landing' },
  { label: 'Explore agents', path: '/explore', kw: 'explore discover browse directory' },
  { label: 'Register a name', path: '/register', kw: 'register claim mint name' },
  { label: 'Network stats', path: '/stats', kw: 'stats analytics metrics economics' },
  { label: 'Docs & SDK', path: '/docs', kw: 'docs sdk api developers' },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<NameRecord[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout>>(null);

  // ⌘K / Ctrl-K toggle + external trigger
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onTrigger = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('neurons:command', onTrigger);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('neurons:command', onTrigger);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQ('');
      setHits([]);
    }
  }, [open]);

  // debounced live agent search
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const term = q.trim().toLowerCase();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const res = await api.explore({ q: term, pageSize: 6, sort: 'reputation' });
        setHits(res.items);
      } catch {
        setHits([]);
      }
    }, 160);
  }, [q]);

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router],
  );

  const slug = q.trim().toLowerCase().replace(/\.agent$/, '');
  const pages = PAGES.filter(
    (p) =>
      !slug ||
      p.label.toLowerCase().includes(slug) ||
      p.kw.includes(slug),
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command menu"
      shouldFilter={false}
    >
      <Command.Input
        value={q}
        onValueChange={setQ}
        placeholder="Resolve a name, jump to a page…"
      />
      <Command.List>
        <Command.Empty>No matches. Type a name to resolve or register.</Command.Empty>

        {slug && (
          <Command.Group heading="Actions">
            <Command.Item value={`resolve-${slug}`} onSelect={() => go(`/agent/${slug}.agent`)}>
              <span style={{ color: 'var(--accent)' }}>→</span>
              <span>Resolve</span>
              <span className="cmdk-mono mono" style={{ marginLeft: 'auto' }}>
                {slug}.agent
              </span>
            </Command.Item>
            <Command.Item value={`register-${slug}`} onSelect={() => go(`/register?name=${slug}`)}>
              <span style={{ color: 'var(--accent)' }}>◇</span>
              <span>Register</span>
              <span className="cmdk-mono mono" style={{ marginLeft: 'auto' }}>
                {slug}
              </span>
            </Command.Item>
          </Command.Group>
        )}

        {hits.length > 0 && (
          <Command.Group heading="Agents">
            {hits.map((h) => (
              <Command.Item
                key={h.name}
                value={`hit-${h.name}`}
                onSelect={() => go(`/agent/${h.name}`)}
              >
                <span style={{ color: 'var(--ink-2)' }}>∴</span>
                <span className="cmdk-mono mono">{h.name}</span>
                {h.verified && (
                  <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="Navigate">
          {pages.map((p) => (
            <Command.Item key={p.path} value={`page-${p.path}`} onSelect={() => go(p.path)}>
              <span style={{ color: 'var(--ink-2)' }}>⌘</span>
              <span>{p.label}</span>
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
