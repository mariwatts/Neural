// Real on-chain verification: register a name, then read it back from chain.
//   node verify.mjs <RPC_URL> <PROGRAM_ID> <PAYER_KEYPAIR_JSON> [name]
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [, , RPC, PROGRAM, KEYPATH, NAME_ARG] = process.argv;
const programId = new PublicKey(PROGRAM);
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(KEYPATH, 'utf8'))));
const name = NAME_ARG || `pruf-${Math.random().toString(36).slice(2, 8)}.agent`;
const conn = new Connection(RPC, 'confirmed');

const u32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
};

// Borsh: enum variant 0 (Register) + name(string) + resolver(pubkey) + years(u32)
function encodeRegister(name, resolver, years) {
  const nb = Buffer.from(name, 'utf8');
  return Buffer.concat([Buffer.from([0]), u32(nb.length), nb, resolver.toBuffer(), u32(years)]);
}

const nameHash = createHash('sha256').update(name).digest();
const [pda] = PublicKey.findProgramAddressSync([Buffer.from('name'), nameHash], programId);

console.log('payer   ', payer.publicKey.toBase58());
console.log('program ', programId.toBase58());
console.log('name    ', name);
console.log('pda     ', pda.toBase58());

const ix = new TransactionInstruction({
  programId,
  keys: [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: pda, isSigner: false, isWritable: true },
    { pubkey: payer.publicKey, isSigner: false, isWritable: true }, // treasury == payer here
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  data: encodeRegister(name, payer.publicKey, 1),
});

const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer], {
  commitment: 'confirmed',
});
console.log('register tx', sig);

const acct = await conn.getAccountInfo(pda, 'confirmed');
if (!acct) throw new Error('PDA not found after register');
const d = acct.data;
let o = 0;
const isInit = d[o]; o += 1;
const bump = d[o]; o += 1;
const owner = new PublicKey(d.subarray(o, o + 32)); o += 32;
const resolver = new PublicKey(d.subarray(o, o + 32)); o += 32;
const expiry = d.readBigInt64LE(o); o += 8;
const nlen = d.readUInt32LE(o); o += 4;
const decoded = d.subarray(o, o + nlen).toString('utf8');

console.log('\n--- on-chain account (read back) ---');
console.log('account owner program', acct.owner.toBase58());
console.log('lamports (rent)      ', acct.lamports);
console.log('is_initialized       ', isInit === 1);
console.log('bump                 ', bump);
console.log('owner                ', owner.toBase58());
console.log('resolver             ', resolver.toBase58());
console.log('expiry (unix)        ', expiry.toString());
console.log('name                 ', decoded);

if (acct.owner.toBase58() !== programId.toBase58()) throw new Error('account not owned by program');
if (owner.toBase58() !== payer.publicKey.toBase58()) throw new Error('owner mismatch');
if (decoded !== name) throw new Error('name mismatch');
console.log('\nPRUF OK — name registered on-chain and resolved back correctly.');
