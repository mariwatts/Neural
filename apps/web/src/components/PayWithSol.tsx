'use client';

import { useEffect, useState } from 'react';
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from '@reown/appkit/react';
import { type Provider } from '@reown/appkit-adapter-solana/react';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { sendTx, type SolWallet } from '@/lib/rpc';
import { neuronsBalance, payNeurons } from '@/lib/token';
import { getProgramConfig } from '@/lib/program';
import { short } from '@/lib/format';

const FALLBACK_TREASURY = new PublicKey('8AQFyZvs9pQAxFaBYcRdJXHNpR8vFkUxQahRdrHzsDvN');
const SOL_PRESETS = [0.05, 0.1, 0.5, 1];
const NEURONS_PRESETS = [1, 5, 10, 50];

type State = 'idle' | 'paying' | 'done' | 'error';
type Method = 'sol' | 'neurons';

export default function PayWithSol() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>('solana');

  const [method, setMethod] = useState<Method>('sol');
  const [amount, setAmount] = useState(0.1);
  const [state, setState] = useState<State>('idle');
  const [sig, setSig] = useState('');
  const [err, setErr] = useState('');
  const [bal, setBal] = useState<number | null>(null);
  const [treasury, setTreasury] = useState<PublicKey>(FALLBACK_TREASURY);

  useEffect(() => {
    getProgramConfig()
      .then((c) => setTreasury(c.treasury))
      .catch(() => {});
  }, []);

  const isSol = method === 'sol';
  const presets = isSol ? SOL_PRESETS : NEURONS_PRESETS;
  const unit = isSol ? 'SOL' : '$NEURONS';

  useEffect(() => {
    if (method !== 'neurons' || !address) {
      setBal(null);
      return;
    }
    let alive = true;
    neuronsBalance(new PublicKey(address))
      .then((b) => alive && setBal(b))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [method, address, state]);

  const switchMethod = (m: Method) => {
    if (m === method) return;
    setMethod(m);
    setAmount(m === 'sol' ? 0.1 : 5);
    setState('idle');
    setErr('');
    setSig('');
  };

  const pay = async () => {
    setErr('');
    if (!isConnected || !address) {
      open({ view: 'Connect', namespace: 'solana' });
      return;
    }
    if (!walletProvider) {
      setErr('Wallet not ready — reconnect and retry.');
      return;
    }
    if (!(amount > 0)) {
      setErr('Enter an amount greater than 0.');
      return;
    }
    try {
      setState('paying');
      const payer = new PublicKey(address);
      let signature: string;
      if (isSol) {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: payer,
            toPubkey: treasury,
            lamports: Math.round(amount * LAMPORTS_PER_SOL),
          }),
        );
        signature = await sendTx(walletProvider as unknown as SolWallet, tx, payer);
      } else {
        signature = await payNeurons(walletProvider as unknown as SolWallet, payer, amount);
      }
      setSig(signature);
      setState('done');
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(/reject|denied|cancel/i.test(m) ? 'Cancelled in wallet.' : m.slice(0, 160));
      setState('error');
    }
  };

  const explorerTx = `https://solscan.io/tx/${sig}`;

  if (state === 'done') {
    return (
      <div className="panel" style={{ padding: 'clamp(24px,4vw,40px)', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ color: 'var(--green)', fontSize: 30 }}>✓</div>
        <h3 style={{ fontSize: 22, marginTop: 10 }}>Payment sent</h3>
        <p style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14 }}>
          {amount} {unit} transferred on Solana mainnet.
        </p>
        <a href={explorerTx} target="_blank" rel="noopener noreferrer" data-hot className="mono" style={{ display: 'inline-block', marginTop: 14, fontSize: 12.5, color: 'var(--accent)', borderBottom: '1px solid var(--accent-deep)' }}>
          view receipt on solscan ↗
        </a>
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-ghost" data-hot onClick={() => { setState('idle'); setSig(''); }}>
            Make another payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ padding: 'clamp(24px,4vw,40px)', maxWidth: 520, margin: '0 auto' }}>
      <div className="eyebrow">Payment method</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          data-hot
          onClick={() => switchMethod('sol')}
          className="chip mono"
          style={{
            height: 42,
            padding: '0 16px',
            cursor: 'pointer',
            borderColor: isSol ? 'var(--accent)' : 'var(--line)',
            background: isSol ? 'var(--accent)' : 'var(--bg-1)',
            color: isSol ? '#fff' : 'var(--ink-1)',
          }}
        >
          ◎ SOL
        </button>
        <button
          type="button"
          data-hot
          onClick={() => switchMethod('neurons')}
          className="chip mono"
          style={{
            height: 42,
            padding: '0 14px',
            cursor: 'pointer',
            borderColor: !isSol ? 'var(--accent)' : 'var(--line)',
            background: !isSol ? 'var(--accent)' : 'var(--bg-1)',
            color: !isSol ? '#fff' : 'var(--ink-1)',
          }}
        >
          $NEURONS
        </button>
      </div>

      <h3 style={{ fontSize: 'clamp(22px,3vw,28px)', marginTop: 22 }}>Amount</h3>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
        {presets.map((p) => (
          <button
            key={p}
            data-hot
            onClick={() => setAmount(p)}
            className="chip mono"
            style={{
              cursor: 'pointer',
              height: 38,
              padding: '0 14px',
              borderColor: amount === p ? 'var(--accent)' : 'var(--line)',
              background: amount === p ? 'var(--accent)' : 'var(--bg-1)',
              color: amount === p ? '#fff' : 'var(--ink-1)',
            }}
          >
            {isSol ? `${p} SOL` : p.toLocaleString()}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, border: '1px solid var(--line)', background: 'var(--bg-1)', borderRadius: 10, padding: '12px 14px' }}>
        <input
          type="number"
          min={0}
          step={isSol ? 0.01 : 1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mono"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink-0)', fontSize: 20 }}
        />
        <span className="mono" style={{ color: 'var(--ink-2)', fontSize: 14 }}>{unit}</span>
      </div>

      {!isSol && isConnected && (
        <div className="mono" style={{ marginTop: 10, fontSize: 11.5, color: 'var(--ink-2)' }}>
          your balance: {bal === null ? '…' : bal.toLocaleString()} $NEURONS
        </div>
      )}

      <button
        onClick={pay}
        data-hot
        disabled={state === 'paying'}
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 18, height: 50, opacity: state === 'paying' ? 0.7 : 1 }}
      >
        {state === 'paying'
          ? 'Confirm in wallet…'
          : isConnected
            ? `Pay ${amount || 0} ${isSol ? 'SOL' : '$NEURONS'}`
            : 'Connect wallet to pay'}
      </button>

      {err && (
        <div className="mono" style={{ marginTop: 12, fontSize: 12.5, color: 'var(--err)' }}>{err}</div>
      )}

      <div className="mono" style={{ marginTop: 16, fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.6 }}>
        <>Real on-chain transfer on Solana mainnet — you sign in your wallet. Sends to treasury{' '}
          <span style={{ color: 'var(--ink-2)' }}>{short(treasury.toBase58(), 4, 4)}</span></>
        {isConnected && address ? <> · from {short(address, 4, 4)}</> : null}
      </div>
    </div>
  );
}
