import { createHash, randomBytes } from 'node:crypto';

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Encode a byte buffer to base58 (Bitcoin/Solana alphabet). */
export function base58encode(bytes: Uint8Array): string {
  // Count leading zeros.
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let out = '1'.repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) out += BASE58_ALPHABET[digits[i]];
  return out;
}

/** A believable, freshly-random Solana-style ed25519 pubkey (32 bytes → 43/44 base58 chars). */
export function randomPubkey(): string {
  return base58encode(randomBytes(32));
}

/** Deterministic pubkey from a seed string — used so a given bot keeps the same wallet. */
export function pubkeyFromSeed(seed: string): string {
  const hash = createHash('sha256').update(`neurons:wallet:${seed}`).digest();
  return base58encode(hash);
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Simulate the PDA derivation from the spec:
 *   seeds = [b"neurons", sha256(name), b".agent"]
 * We hash the concatenation and base58-encode it — visually identical to a
 * real Solana program-derived address.
 */
export function derivePda(name: string): string {
  const hash = createHash('sha256')
    .update('neurons')
    .update(createHash('sha256').update(name).digest())
    .update('.agent')
    .digest();
  return base58encode(hash);
}

/** A believable Arweave/IPFS metadata URI for the AgentCard manifest. */
export function metadataUri(name: string): string {
  const txid = base58encode(createHash('sha256').update(`ar:${name}`).digest()).slice(
    0,
    43,
  );
  return `ar://${txid}`;
}

/** Shorten a pubkey for UI display: AbCd…WxYz */
export function shortPubkey(pk: string, head = 4, tail = 4): string {
  if (pk.length <= head + tail + 1) return pk;
  return `${pk.slice(0, head)}…${pk.slice(-tail)}`;
}
