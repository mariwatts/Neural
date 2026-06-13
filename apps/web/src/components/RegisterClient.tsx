'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { type Provider } from '@reown/appkit-adapter-solana/react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { api, API_BASE } from '@/lib/api';
import {
  buildMintCardIx,
  buildRegisterIx,
  buildTreasuryAtaIx,
  configTokenBalance,
  getProgramConfig,
  namePda,
  priceFor,
  type ProgramConfig,
} from '@/lib/program';
import { getConnection, sendTx, type SolWallet } from '@/lib/rpc';
import { CATEGORIES } from '@/lib/categories';
import { capsFor } from '@/lib/capabilities';
import { short } from '@/lib/format';
import type { Availability } from '@/lib/types';
import Handle from './Handle';
import AgentAvatar from './AgentAvatar';

const SANITIZE = /[^a-z0-9-]/g;
const CANONICAL_API = 'https://neuralns.xyz/api';

export default function RegisterClient({
  initialName = '',
  initialCategory = 'base',
}: {
  initialName?: string;
  initialCategory?: string;
}) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>('solana');

  const [label, setLabel] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [caps, setCaps] = useState<string[]>([]);
  const [endpoint, setEndpoint] = useState('');
  const [soulbound, setSoulbound] = useState(false);
  const [mintCard, setMintCard] = useState(true);
  const [payToken, setPayToken] = useState(false);
  const [cfg, setCfg] = useState<ProgramConfig | null>(null);
  const [tokenBal, setTokenBal] = useState(0);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ name: string; pda: string; sig: string; card?: string } | null>(null);
  const [previewPda, setPreviewPda] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout>>(null);

  const tld = category === 'base' ? '.agent' : `.${category}.agent`;
  const catCaps = useMemo(() => capsFor(category), [category]);

  // on-chain config (prices, payment token, treasury) — retry until it loads
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    const load = () =>
      getProgramConfig()
        .then((c) => {
          if (!alive) return;
          setCfg(c);
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
        })
        .catch(() => {});
    load();
    timer = setInterval(load, 3000);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  // holder balance of the payment token
  useEffect(() => {
    if (!cfg?.tokenMint || !address) {
      setTokenBal(0);
      return;
    }
    let alive = true;
    configTokenBalance(new PublicKey(address), cfg)
      .then((b) => alive && setTokenBal(b))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [cfg, address]);

  // default capabilities when category changes
  useEffect(() => {
    setCaps(catCaps.slice(0, 3));
  }, [category, catCaps]);

  // live availability
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const clean = label.trim().toLowerCase();
    if (!clean) {
      setAvail(null);
      return;
    }
    setChecking(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await api.availability(clean, category === 'base' ? undefined : category);
        setAvail(res);
      } catch {
        setAvail(null);
      } finally {
        setChecking(false);
      }
    }, 260);
  }, [label, category]);

  // real on-chain PDA preview (matches the deployed program's derivation)
  useEffect(() => {
    const name = `${label.trim()}${tld}`;
    if (!label.trim()) {
      setPreviewPda('');
      return;
    }
    let alive = true;
    namePda(name)
      .then((p) => alive && setPreviewPda(p.toBase58()))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [label, tld]);

  const toggleCap = (c: string) =>
    setCaps((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c].slice(0, 8)));

  const pricing = cfg && label.trim() ? priceFor(cfg, label.trim()) : null;
  const tokenDue = pricing && cfg ? Number(pricing.token) / 10 ** cfg.tokenDecimals : 0;
  const holderDiscount =
    !!cfg?.tokenMint &&
    cfg.holderMinBalance > 0n &&
    tokenBal * 10 ** (cfg?.tokenDecimals ?? 6) >= Number(cfg?.holderMinBalance ?? 0n);
  const solDue = pricing
    ? holderDiscount && !payToken
      ? (pricing.sol * (10_000 - (cfg?.discountBps ?? 0))) / 10_000
      : pricing.sol
    : 0;
  const canPayToken = !!cfg?.tokenMint;

  const canSubmit = !!label.trim() && !submitting;

  const submit = async () => {
    setError('');
    const name = `${label.trim()}${tld}`;
    if (!isConnected || !address) {
      open({ view: 'Connect', namespace: 'solana' });
      return;
    }
    if (!label.trim()) return;
    if (!walletProvider) {
      setError('Wallet not ready — reconnect and retry.');
      return;
    }
    if (!cfg) {
      setError('On-chain config not loaded yet — retry in a second.');
      return;
    }
    setSubmitting(true);
    try {
      const payer = new PublicKey(address);
      const conn = getConnection();
      const metadataUri = `${CANONICAL_API}/agent/${name}/card.json`;
      const { ix, pda } = await buildRegisterIx(payer, name, cfg, {
        years: 1,
        metadataUri,
        payWithToken: payToken,
        useDiscount: !payToken && holderDiscount,
      });
      const existing = await conn.getAccountInfo(pda);
      if (existing) {
        setError('That name is already registered on-chain — try another.');
        return;
      }
      const tx = new Transaction();
      if (payToken) tx.add(buildTreasuryAtaIx(payer, cfg));
      tx.add(ix);
      let card: string | undefined;
      if (mintCard) {
        const built = await buildMintCardIx(payer, name, soulbound);
        tx.add(built.ix);
        card = built.mint.toBase58();
      }
      const sig = await sendTx(walletProvider as unknown as SolWallet, tx, payer);
      setDone({ name, pda: pda.toBase58(), sig, card });
      // remember the AgentCard manifest off-chain + index the new on-chain name
      api
        .register({
          label: label.trim(),
          category: category === 'base' ? undefined : category,
          owner: address,
          capabilities: caps,
          endpoint: endpoint ? `https://${endpoint.replace(/^https?:\/\//, '')}` : undefined,
          soulbound,
        })
        .catch(() => {});
      fetch(`${API_BASE}/index/refresh`, { method: 'POST' }).catch(() => {});
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setError(/reject|denied|cancel/i.test(m) ? 'Cancelled in wallet.' : m.slice(0, 160));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return <SuccessCard res={done} onReset={() => { setDone(null); setLabel(''); }} />;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 20 }} className="reg-grid">
      {/* form */}
      <div style={{ display: 'grid', gap: 18 }}>
        {/* name field */}
        <Field label="Agent name" hint="a–z, 0–9, hyphens · 1–32 chars">
          <div className="panel" style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderColor: avail?.available ? 'var(--accent-dim)' : 'var(--line-bright)' }}>
            <input
              value={label}
              autoFocus
              onChange={(e) => setLabel(e.target.value.toLowerCase().replace(SANITIZE, '').slice(0, 32))}
              placeholder="your-agent"
              spellCheck={false}
              className="mono"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink-0)', fontSize: 20, height: 58 }}
            />
            <span className="mono" style={{ color: 'var(--ink-2)', fontSize: 17 }}>{tld}</span>
          </div>
          <div style={{ height: 18, marginTop: 8 }}>
            {label && (
              <span className="mono" style={{ fontSize: 12, color: checking ? 'var(--ink-2)' : avail?.available ? 'var(--accent-bright)' : 'var(--amber)' }}>
                {checking ? 'checking…' : avail?.available ? '● available' : '● taken — try another'}
              </span>
            )}
          </div>
        </Field>

        {/* category */}
        <Field label="Category namespace">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setCategory('base')} data-hot className={`chip ${category === 'base' ? 'chip-active' : ''}`} style={{ cursor: 'pointer' }}>
              base (.agent)
            </button>
            {CATEGORIES.filter((c) => c.key !== 'base').map((c) => (
              <button key={c.key} onClick={() => setCategory(c.key)} data-hot className={`chip ${category === c.key ? 'chip-active' : ''}`} style={{ cursor: 'pointer' }}>
                {c.glyph} .{c.key}
              </button>
            ))}
          </div>
        </Field>

        {/* capabilities */}
        <Field label="Capabilities" hint={`${caps.length} selected · max 8`}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {catCaps.map((c) => (
              <button key={c} onClick={() => toggleCap(c)} data-hot className={`chip ${caps.includes(c) ? 'chip-active' : ''}`} style={{ cursor: 'pointer' }}>
                {c}
              </button>
            ))}
          </div>
        </Field>

        {/* endpoint */}
        <Field label="Webhook endpoint" hint="optional">
          <div className="panel" style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
            <span className="mono" style={{ color: 'var(--ink-3)', fontSize: 13 }}>https://</span>
            <input
              value={endpoint.replace(/^https?:\/\//, '')}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="my-agent.com/hook"
              spellCheck={false}
              className="mono"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink-0)', fontSize: 14, height: 48 }}
            />
          </div>
        </Field>

        {/* payment method */}
        {canPayToken && (
          <Field label="Pay with" hint={tokenBal > 0 ? `balance: ${tokenBal.toLocaleString()} $NEURONS` : undefined}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPayToken(false)} data-hot className={`chip ${!payToken ? 'chip-active' : ''}`} style={{ cursor: 'pointer' }}>
                ◎ SOL{holderDiscount ? ` · -${(cfg!.discountBps / 100).toFixed(0)}% holder` : ''}
              </button>
              <button onClick={() => setPayToken(true)} data-hot className={`chip ${payToken ? 'chip-active' : ''}`} style={{ cursor: 'pointer' }}>
                $NEURONS
              </button>
            </div>
          </Field>
        )}

        {/* AgentCard NFT */}
        <Toggle
          on={mintCard}
          onClick={() => setMintCard((s) => !s)}
          title="Mint AgentCard NFT"
          sub="Token-2022 NFT with the agent's metadata, minted in the same transaction."
        />
        {mintCard && (
          <Toggle
            on={soulbound}
            onClick={() => setSoulbound((s) => !s)}
            title="Soulbound AgentCard"
            sub="Non-transferable (Token-2022 extension). Binds identity to this agent."
          />
        )}
      </div>

      {/* summary */}
      <div style={{ position: 'sticky', top: 88, alignSelf: 'start' }}>
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <AgentAvatar seed={(avail?.nameHash ?? 'neurons').slice(0, 16)} category={category} size={46} />
            <div style={{ minWidth: 0 }}>
              <Handle name={`${label || 'your-agent'}${tld}`} size={15} />
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
                {previewPda ? short(previewPda, 6, 6) : 'PDA derives on submit'}
              </div>
            </div>
          </div>

          <div className="divider" style={{ margin: '18px 0' }} />

          <Row k="Network" v="Solana mainnet" />
          {pricing ? (
            <>
              <Row k="Tier" v={pricing.tier + (pricing.permanent ? ' · permanent' : '')} />
              <Row
                k="Registration fee"
                v={payToken ? `${tokenDue.toLocaleString()} $NEURONS` : `${solDue} ◎${pricing.permanent ? '' : ' / year'}`}
                accent
              />
            </>
          ) : label.trim() ? (
            <Row k="Registration fee" v="loading on-chain config…" />
          ) : null}
          <Row k="Account rent" v="≈ 0.0036 ◎" />
          <Row k="Expiry" v={!pricing ? '…' : pricing.permanent ? 'never (premium)' : '1 year · renewable'} />
          {mintCard && <Row k="AgentCard NFT" v={soulbound ? 'soulbound' : 'transferable'} />}

          <button
            onClick={submit}
            disabled={isConnected && !canSubmit}
            data-hot
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 20, opacity: isConnected && !label.trim() ? 0.5 : 1 }}
          >
            {submitting
              ? 'Confirm in wallet…'
              : !isConnected
                ? 'Connect wallet to register'
                : !label.trim()
                  ? 'Enter a name'
                  : !cfg
                    ? 'Loading on-chain config…'
                    : payToken
                      ? `Register for ${tokenDue.toLocaleString()} $NEURONS`
                      : `Register for ~${solDue} ◎`}
          </button>

          {isConnected && (
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 10, textAlign: 'center' }}>
              owner · {short(address ?? '', 4, 4)}
            </div>
          )}
          {error && (
            <div className="mono" style={{ fontSize: 12, color: 'var(--err)', marginTop: 10, textAlign: 'center' }}>
              {error}
            </div>
          )}
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 12, lineHeight: 1.5, textAlign: 'center' }}>
          Real on-chain registration on Solana mainnet — you sign in your wallet.
          SOL fees go to the protocol treasury; <strong>$NEURONS fees are 100% burned</strong> in
          the same transaction. The name resolves immediately.
        </p>
      </div>

      <style>{`@media (max-width: 820px){ .reg-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

function Toggle({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} data-hot style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
      <span style={{ width: 40, height: 23, borderRadius: 99, background: on ? 'var(--accent-dim)' : 'var(--bg-3)', border: '1px solid var(--line-bright)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 19 : 2, width: 17, height: 17, borderRadius: '50%', background: on ? '#03130c' : 'var(--ink-1)', transition: 'left 0.2s' }} />
      </span>
      <span>
        <span style={{ fontSize: 14, color: 'var(--ink-0)' }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{sub}</span>
      </span>
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="eyebrow">{label}</span>
        {hint && <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v, accent, small }: { k: string; v: string; accent?: boolean; small?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: small ? '4px 0' : '6px 0' }}>
      <span style={{ fontSize: small ? 12 : 13, color: 'var(--ink-2)' }}>{k}</span>
      <span className="mono tnum" style={{ fontSize: small ? 12 : 14, color: accent ? 'var(--accent-bright)' : 'var(--ink-0)' }}>{v}</span>
    </div>
  );
}

function SuccessCard({
  res,
  onReset,
}: {
  res: { name: string; pda: string; sig: string; card?: string };
  onReset: () => void;
}) {
  return (
    <div className="panel" style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(28px,5vw,48px)', textAlign: 'center', background: 'radial-gradient(120% 140% at 50% 0%, rgba(47,168,85,0.14), transparent 60%), var(--color-bg-1)' }}>
      <div className="pulse-ring" style={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto', background: 'var(--bg-2)', border: '1px solid var(--accent-dim)', color: 'var(--accent-bright)', fontSize: 28 }}>
        ✓
      </div>
      <h2 style={{ fontSize: 28, marginTop: 22 }}>Registered on mainnet.</h2>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
        <Handle name={res.name} size={22} />
      </div>
      <p style={{ color: 'var(--ink-2)', marginTop: 14, fontSize: 13.5 }}>
        Name PDA <span className="mono" style={{ color: 'var(--ink-1)' }}>{short(res.pda, 6, 6)}</span> created on-chain
        {res.card ? <> · AgentCard NFT <span className="mono" style={{ color: 'var(--ink-1)' }}>{short(res.card, 6, 6)}</span> minted</> : null}
        {' '}— owned by your wallet, resolvable now.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap' }}>
        {res.card && (
          <a href={`https://xray.helius.xyz/token/${res.card}?network=mainnet`} target="_blank" rel="noopener noreferrer" className="btn btn-primary" data-hot>View AgentCard NFT ↗</a>
        )}
        <a href={`https://xray.helius.xyz/tx/${res.sig}?network=mainnet`} target="_blank" rel="noopener noreferrer" className={res.card ? 'btn btn-ghost' : 'btn btn-primary'} data-hot>View transaction ↗</a>
        <a href={`https://solscan.io/account/${res.pda}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" data-hot>View name account ↗</a>
        <a href="/explore" className="btn btn-ghost" data-hot>Browse the registry →</a>
        <button onClick={onReset} className="btn btn-ghost" data-hot>Register another</button>
      </div>
    </div>
  );
}
