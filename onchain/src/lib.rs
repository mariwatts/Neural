//! NEURONS · NeuralNS — native Solana on-chain namespace registry for AI agents (v2, no Anchor).
//!
//! A `.agent` name is a PDA derived from sha256(name) storing owner / resolver /
//! expiry / metadata_uri / verified / card_mint on chain. All economics (treasury,
//! $NEURONS mint, tier prices, holder discount, verify fee, pause) live in a
//! Config PDA updatable by the admin — swapping the payment token before launch
//! is a single `UpdateConfig` transaction, no program upgrade.
//!
//! Instructions:
//!   Register            — SOL fee by length tier (1-4 chars permanent, 5-9 / 10+ yearly);
//!                         optional trailing [mint, payer_ata] applies the holder discount.
//!   RegisterWithToken   — fee paid in the configured token; 100% of it is BURNED.
//!   UpdateResolver / Transfer / Renew / UpdateMetadata — owner-signed mutations.
//!   MintAgentCard       — mints the AgentCard as a Token-2022 NFT (0 decimals,
//!                         metadata extension, optional non-transferable/soulbound).
//!   Verify              — owner pays the verify fee, record flagged verified.
//!   SetVerified         — admin override of the verified flag.
//!   InitConfig / UpdateConfig — bootstrap (hardcoded ADMIN) / admin-signed updates.

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    hash::hashv,
    instruction::{AccountMeta, Instruction as SolInstruction},
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction, system_program,
    sysvar::Sysvar,
};

// ───────────────────────────────── config ─────────────────────────────────
solana_program::declare_id!("5dqCWiZvLWD1Nge15UhXyGCGd2rF8uN6nPigdnLRWCv1");

/// Only this key may call InitConfig (prevents config front-running). The
/// runtime admin lives in the Config account and can be rotated later.
const ADMIN: Pubkey = solana_program::pubkey!("8AQFyZvs9pQAxFaBYcRdJXHNpR8vFkUxQahRdrHzsDvN");

const NAME_SEED: &[u8] = b"name";
const CARD_SEED: &[u8] = b"card";
const CONFIG_SEED: &[u8] = b"config";

const MAX_NAME_LEN: usize = 64; // full "label.category.agent"
const MAX_LABEL_LEN: usize = 32;
const MAX_URI_LEN: usize = 200;
const SECONDS_PER_YEAR: i64 = 31_536_000;
const GRACE_SECONDS: i64 = 30 * 86_400;
const CARD_SYMBOL: &str = "NEURONS";

const TOKEN_2022_ID: Pubkey =
    solana_program::pubkey!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const TOKEN_CLASSIC_ID: Pubkey =
    solana_program::pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

// version(1) bump(1) owner(32) resolver(32) expiry(8) verified(1) card_mint(32)
// + name(4+64) + uri(4+200)
const RECORD_SIZE: usize = 1 + 1 + 32 + 32 + 8 + 1 + 32 + (4 + MAX_NAME_LEN) + (4 + MAX_URI_LEN);
/// Config is serialized into a fixed account with headroom for future fields.
const CONFIG_SIZE: usize = 256;

// ───────────────────────────────── state ──────────────────────────────────
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct NameRecord {
    pub version: u8, // 2
    pub bump: u8,
    pub owner: Pubkey,
    pub resolver: Pubkey,
    pub expiry: i64, // unix seconds, 0 = permanent
    pub verified: bool,
    pub card_mint: Pubkey, // Pubkey::default() until the AgentCard is minted
    pub name: String,
    pub metadata_uri: String,
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct ConfigParams {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    /// Payment token mint (Token-2022 or classic SPL). Pubkey::default() disables
    /// token payments + holder discounts. Swappable any time via UpdateConfig.
    pub token_mint: Pubkey,
    pub token_decimals: u8,
    pub price_premium: u64,    // lamports, flat (1-4 chars, permanent)
    pub price_standard: u64,   // lamports / year (5-9 chars)
    pub price_accessible: u64, // lamports / year (10+ chars)
    pub token_price_premium: u64, // raw token units, flat
    pub token_price_standard: u64, // raw units / year
    pub token_price_accessible: u64, // raw units / year
    pub holder_min_balance: u64, // raw units to qualify for the discount (0 = off)
    pub verify_fee: u64,       // lamports
    pub discount_bps: u16,     // e.g. 2500 = 25% off SOL fees for holders
    pub paused: u8,
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct Config {
    pub version: u8, // 1
    pub bump: u8,
    pub params: ConfigParams,
}

// ─────────────────────────────── instructions ─────────────────────────────
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum Instruction {
    /// [payer(s,w), record(w,pda), config, treasury(w), system, (mint, payer_ata)?]
    Register { name: String, resolver: Pubkey, years: u32, metadata_uri: String },
    /// [payer(s,w), record(w,pda), config, treasury, system, mint, payer_ata(w), treasury_ata(w), token_program]
    RegisterWithToken { name: String, resolver: Pubkey, years: u32, metadata_uri: String },
    /// [owner(s), record(w)]
    UpdateResolver { resolver: Pubkey },
    /// [owner(s), record(w)]
    Transfer { new_owner: Pubkey },
    /// [payer(s,w), record(w), config, treasury(w), system]
    Renew { years: u32 },
    /// [owner(s), record(w)]
    UpdateMetadata { uri: String },
    /// [owner(s,w), record(w), card_mint(w,pda), owner_ata(w), token22, ata_program, system]
    MintAgentCard { soulbound: bool },
    /// [owner(s,w), record(w), config, treasury(w), system]
    Verify,
    /// [admin(s), record(w), config]
    SetVerified { verified: bool },
    /// [admin(s,w), config(w,pda), system] — admin must equal hardcoded ADMIN
    InitConfig { params: ConfigParams },
    /// [admin(s), config(w,pda)] — admin must equal config.params.admin
    UpdateConfig { params: ConfigParams },
}

// ───────────────────────────────── errors ─────────────────────────────────
#[repr(u32)]
pub enum RegistryError {
    NotOwner = 1,
    NameInvalid = 2,
    YearsInvalid = 3,
    BadTreasury = 4,
    UriTooLong = 5,
    Paused = 6,
    NotAdmin = 7,
    TokenDisabled = 8,
    BadTokenAccount = 9,
    CardAlreadyMinted = 10,
    NameTaken = 11,
    NotRenewable = 12,
}
impl From<RegistryError> for ProgramError {
    fn from(e: RegistryError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

// ───────────────────────────────── derive ─────────────────────────────────
pub fn name_pda(name: &str, program_id: &Pubkey) -> (Pubkey, u8, [u8; 32]) {
    let hash = hashv(&[name.as_bytes()]).to_bytes();
    let (pda, bump) = Pubkey::find_program_address(&[NAME_SEED, &hash], program_id);
    (pda, bump, hash)
}

pub fn card_pda(name: &str, program_id: &Pubkey) -> (Pubkey, u8, [u8; 32]) {
    let hash = hashv(&[name.as_bytes()]).to_bytes();
    let (pda, bump) = Pubkey::find_program_address(&[CARD_SEED, &hash], program_id);
    (pda, bump, hash)
}

pub fn config_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[CONFIG_SEED], program_id)
}

// ─────────────────────────────── entrypoint ───────────────────────────────
entrypoint!(process);

pub fn process(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let ix = Instruction::try_from_slice(data).map_err(|_| ProgramError::InvalidInstructionData)?;
    match ix {
        Instruction::Register { name, resolver, years, metadata_uri } => {
            register(program_id, accounts, name, resolver, years, metadata_uri, false)
        }
        Instruction::RegisterWithToken { name, resolver, years, metadata_uri } => {
            register(program_id, accounts, name, resolver, years, metadata_uri, true)
        }
        Instruction::UpdateResolver { resolver } => update_resolver(program_id, accounts, resolver),
        Instruction::Transfer { new_owner } => transfer(program_id, accounts, new_owner),
        Instruction::Renew { years } => renew(program_id, accounts, years),
        Instruction::UpdateMetadata { uri } => update_metadata(program_id, accounts, uri),
        Instruction::MintAgentCard { soulbound } => mint_agent_card(program_id, accounts, soulbound),
        Instruction::Verify => verify(program_id, accounts),
        Instruction::SetVerified { verified } => set_verified(program_id, accounts, verified),
        Instruction::InitConfig { params } => init_config(program_id, accounts, params),
        Instruction::UpdateConfig { params } => update_config(program_id, accounts, params),
    }
}

// ─────────────────────────────── validation ───────────────────────────────
fn validate_name(name: &str) -> Result<usize, ProgramError> {
    if name.is_empty() || name.len() > MAX_NAME_LEN || !name.ends_with(".agent") {
        return Err(RegistryError::NameInvalid.into());
    }
    let ok = name
        .bytes()
        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'.' || b == b'-');
    if !ok {
        return Err(RegistryError::NameInvalid.into());
    }
    let label = name.split('.').next().unwrap_or("");
    if label.is_empty() || label.len() > MAX_LABEL_LEN {
        return Err(RegistryError::NameInvalid.into());
    }
    Ok(label.len())
}

/// (sol_due, token_due, permanent) for a label length + years.
fn fee_for(cfg: &ConfigParams, label_len: usize, years: u32) -> Result<(u64, u64, bool), ProgramError> {
    let (sol, tok, permanent) = match label_len {
        1..=4 => (cfg.price_premium, cfg.token_price_premium, true),
        5..=9 => (cfg.price_standard, cfg.token_price_standard, false),
        _ => (cfg.price_accessible, cfg.token_price_accessible, false),
    };
    if permanent {
        return Ok((sol, tok, true));
    }
    if years == 0 || years > 10 {
        return Err(RegistryError::YearsInvalid.into());
    }
    let y = years as u64;
    Ok((
        sol.checked_mul(y).ok_or(ProgramError::ArithmeticOverflow)?,
        tok.checked_mul(y).ok_or(ProgramError::ArithmeticOverflow)?,
        false,
    ))
}

fn load_config(program_id: &Pubkey, config: &AccountInfo) -> Result<Config, ProgramError> {
    let (pda, _) = config_pda(program_id);
    if config.key != &pda || config.owner != program_id {
        return Err(ProgramError::InvalidAccountData);
    }
    Config::deserialize(&mut &config.data.borrow()[..]).map_err(|_| ProgramError::InvalidAccountData)
}

/// SPL token account sanity: owned by a token program, right mint + owner.
/// Returns the balance (u64 LE at offset 64 in both token programs).
fn token_balance(
    acc: &AccountInfo,
    expect_mint: &Pubkey,
    expect_owner: &Pubkey,
) -> Result<u64, ProgramError> {
    if acc.owner != &TOKEN_2022_ID && acc.owner != &TOKEN_CLASSIC_ID {
        return Err(RegistryError::BadTokenAccount.into());
    }
    let data = acc.data.borrow();
    if data.len() < 72 {
        return Err(RegistryError::BadTokenAccount.into());
    }
    if &data[0..32] != expect_mint.as_ref() || &data[32..64] != expect_owner.as_ref() {
        return Err(RegistryError::BadTokenAccount.into());
    }
    let mut amount = [0u8; 8];
    amount.copy_from_slice(&data[64..72]);
    Ok(u64::from_le_bytes(amount))
}

fn ata_for(owner: &Pubkey, mint: &Pubkey, token_program: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[owner.as_ref(), token_program.as_ref(), mint.as_ref()],
        &ATA_PROGRAM_ID,
    )
    .0
}

// ─────────────────────────────── register ─────────────────────────────────
#[allow(clippy::too_many_arguments)]
fn register(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    name: String,
    resolver: Pubkey,
    years: u32,
    metadata_uri: String,
    with_token: bool,
) -> ProgramResult {
    let it = &mut accounts.iter();
    let payer = next_account_info(it)?;
    let record = next_account_info(it)?;
    let config_acc = next_account_info(it)?;
    let treasury = next_account_info(it)?;
    let system = next_account_info(it)?;

    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if system.key != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }
    let cfg = load_config(program_id, config_acc)?.params;
    if cfg.paused != 0 {
        return Err(RegistryError::Paused.into());
    }
    if treasury.key != &cfg.treasury {
        return Err(RegistryError::BadTreasury.into());
    }
    let label_len = validate_name(&name)?;
    if metadata_uri.len() > MAX_URI_LEN {
        return Err(RegistryError::UriTooLong.into());
    }
    let (sol_due, token_due, permanent) = fee_for(&cfg, label_len, years)?;

    let (pda, bump, hash) = name_pda(&name, program_id);
    if &pda != record.key {
        return Err(ProgramError::InvalidSeeds);
    }

    let now = Clock::get()?.unix_timestamp;

    // Existing record: only an expired name past its grace period can be re-taken.
    let takeover = if record.data_is_empty() {
        false
    } else {
        let old = NameRecord::deserialize(&mut &record.data.borrow()[..])
            .map_err(|_| ProgramError::InvalidAccountData)?;
        if old.expiry == 0 || now <= old.expiry.saturating_add(GRACE_SECONDS) {
            return Err(RegistryError::NameTaken.into());
        }
        true
    };

    // ── collect the fee ──
    if with_token {
        if cfg.token_mint == Pubkey::default() {
            return Err(RegistryError::TokenDisabled.into());
        }
        let mint = next_account_info(it)?;
        let payer_ata = next_account_info(it)?;
        let treasury_ata = next_account_info(it)?;
        let token_program = next_account_info(it)?;
        if mint.key != &cfg.token_mint {
            return Err(RegistryError::BadTokenAccount.into());
        }
        if mint.owner != token_program.key
            || (token_program.key != &TOKEN_2022_ID && token_program.key != &TOKEN_CLASSIC_ID)
        {
            return Err(RegistryError::BadTokenAccount.into());
        }
        if treasury_ata.key != &ata_for(&cfg.treasury, mint.key, token_program.key) {
            return Err(RegistryError::BadTokenAccount.into());
        }
        if token_due > 0 {
            // 100% of token fees are BURNED — supply leaves circulation forever,
            // verifiable in every payment transaction.
            // BurnChecked = tag 15: [15, amount u64le, decimals u8]
            let mut data = Vec::with_capacity(10);
            data.push(15u8);
            data.extend_from_slice(&token_due.to_le_bytes());
            data.push(cfg.token_decimals);
            invoke(
                &SolInstruction {
                    program_id: *token_program.key,
                    accounts: vec![
                        AccountMeta::new(*payer_ata.key, false),
                        AccountMeta::new(*mint.key, false),
                        AccountMeta::new_readonly(*payer.key, true),
                    ],
                    data,
                },
                &[payer_ata.clone(), mint.clone(), payer.clone()],
            )?;
            msg!("burned {} raw token units", token_due);
        }
    } else {
        // Optional holder discount: trailing [mint, payer_ata].
        let mut due = sol_due;
        if let (Some(mint), Some(payer_ata)) = (it.next(), it.next()) {
            if cfg.token_mint != Pubkey::default()
                && mint.key == &cfg.token_mint
                && cfg.holder_min_balance > 0
                && cfg.discount_bps > 0
            {
                let bal = token_balance(payer_ata, &cfg.token_mint, payer.key)?;
                if bal >= cfg.holder_min_balance {
                    due = due
                        .checked_mul(10_000u64.saturating_sub(cfg.discount_bps as u64))
                        .ok_or(ProgramError::ArithmeticOverflow)?
                        / 10_000;
                    msg!("holder discount applied: {} bps", cfg.discount_bps);
                }
            }
        }
        if due > 0 {
            invoke(
                &system_instruction::transfer(payer.key, treasury.key, due),
                &[payer.clone(), treasury.clone(), system.clone()],
            )?;
        }
    }

    // ── create or overwrite the record ──
    if !takeover {
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(RECORD_SIZE);
        invoke_signed(
            &system_instruction::create_account(
                payer.key,
                record.key,
                lamports,
                RECORD_SIZE as u64,
                program_id,
            ),
            &[payer.clone(), record.clone(), system.clone()],
            &[&[NAME_SEED, &hash, &[bump]]],
        )?;
    }

    let expiry = if permanent {
        0
    } else {
        now.checked_add((years as i64).checked_mul(SECONDS_PER_YEAR).ok_or(ProgramError::ArithmeticOverflow)?)
            .ok_or(ProgramError::ArithmeticOverflow)?
    };

    // On takeover the previous card mint PDA already exists; keep the reference.
    let card_mint = if takeover {
        NameRecord::deserialize(&mut &record.data.borrow()[..])
            .map(|r| r.card_mint)
            .unwrap_or_default()
    } else {
        Pubkey::default()
    };

    let rec = NameRecord {
        version: 2,
        bump,
        owner: *payer.key,
        resolver,
        expiry,
        verified: false,
        card_mint,
        name,
        metadata_uri,
    };
    write_account(record, &rec)?;
    msg!("registered {} (expiry {})", rec.name, expiry);
    Ok(())
}

// ───────────────────────────── owner mutations ─────────────────────────────
fn update_resolver(program_id: &Pubkey, accounts: &[AccountInfo], resolver: Pubkey) -> ProgramResult {
    let it = &mut accounts.iter();
    let owner = next_account_info(it)?;
    let record = next_account_info(it)?;
    let mut rec = load_owned(program_id, owner, record)?;
    rec.resolver = resolver;
    write_account(record, &rec)
}

fn transfer(program_id: &Pubkey, accounts: &[AccountInfo], new_owner: Pubkey) -> ProgramResult {
    let it = &mut accounts.iter();
    let owner = next_account_info(it)?;
    let record = next_account_info(it)?;
    let mut rec = load_owned(program_id, owner, record)?;
    rec.owner = new_owner;
    write_account(record, &rec)
}

fn update_metadata(program_id: &Pubkey, accounts: &[AccountInfo], uri: String) -> ProgramResult {
    let it = &mut accounts.iter();
    let owner = next_account_info(it)?;
    let record = next_account_info(it)?;
    if uri.len() > MAX_URI_LEN {
        return Err(RegistryError::UriTooLong.into());
    }
    let mut rec = load_owned(program_id, owner, record)?;
    rec.metadata_uri = uri;
    write_account(record, &rec)
}

fn renew(program_id: &Pubkey, accounts: &[AccountInfo], years: u32) -> ProgramResult {
    let it = &mut accounts.iter();
    let payer = next_account_info(it)?;
    let record = next_account_info(it)?;
    let config_acc = next_account_info(it)?;
    let treasury = next_account_info(it)?;
    let system = next_account_info(it)?;

    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    let cfg = load_config(program_id, config_acc)?.params;
    if cfg.paused != 0 {
        return Err(RegistryError::Paused.into());
    }
    if treasury.key != &cfg.treasury {
        return Err(RegistryError::BadTreasury.into());
    }
    if record.owner != program_id {
        return Err(ProgramError::IllegalOwner);
    }
    let mut rec = NameRecord::deserialize(&mut &record.data.borrow()[..])
        .map_err(|_| ProgramError::InvalidAccountData)?;
    if rec.expiry == 0 {
        return Err(RegistryError::NotRenewable.into()); // permanent name
    }
    let label_len = rec.name.split('.').next().unwrap_or("").len();
    let (sol_due, _, _) = fee_for(&cfg, label_len, years)?;
    if sol_due > 0 {
        invoke(
            &system_instruction::transfer(payer.key, treasury.key, sol_due),
            &[payer.clone(), treasury.clone(), system.clone()],
        )?;
    }
    let now = Clock::get()?.unix_timestamp;
    let base = core::cmp::max(now, rec.expiry);
    rec.expiry = base
        .checked_add((years as i64).checked_mul(SECONDS_PER_YEAR).ok_or(ProgramError::ArithmeticOverflow)?)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    write_account(record, &rec)
}

fn verify(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let it = &mut accounts.iter();
    let owner = next_account_info(it)?;
    let record = next_account_info(it)?;
    let config_acc = next_account_info(it)?;
    let treasury = next_account_info(it)?;
    let system = next_account_info(it)?;

    let cfg = load_config(program_id, config_acc)?.params;
    if treasury.key != &cfg.treasury {
        return Err(RegistryError::BadTreasury.into());
    }
    let mut rec = load_owned(program_id, owner, record)?;
    if cfg.verify_fee > 0 {
        invoke(
            &system_instruction::transfer(owner.key, treasury.key, cfg.verify_fee),
            &[owner.clone(), treasury.clone(), system.clone()],
        )?;
    }
    rec.verified = true;
    write_account(record, &rec)
}

fn set_verified(program_id: &Pubkey, accounts: &[AccountInfo], verified: bool) -> ProgramResult {
    let it = &mut accounts.iter();
    let admin = next_account_info(it)?;
    let record = next_account_info(it)?;
    let config_acc = next_account_info(it)?;
    if !admin.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    let cfg = load_config(program_id, config_acc)?.params;
    if admin.key != &cfg.admin {
        return Err(RegistryError::NotAdmin.into());
    }
    if record.owner != program_id {
        return Err(ProgramError::IllegalOwner);
    }
    let mut rec = NameRecord::deserialize(&mut &record.data.borrow()[..])
        .map_err(|_| ProgramError::InvalidAccountData)?;
    rec.verified = verified;
    write_account(record, &rec)
}

// ────────────────────────────── AgentCard NFT ──────────────────────────────
fn mint_agent_card(program_id: &Pubkey, accounts: &[AccountInfo], soulbound: bool) -> ProgramResult {
    let it = &mut accounts.iter();
    let owner = next_account_info(it)?;
    let record = next_account_info(it)?;
    let card = next_account_info(it)?;
    let owner_ata = next_account_info(it)?;
    let token22 = next_account_info(it)?;
    let ata_program = next_account_info(it)?;
    let system = next_account_info(it)?;

    if token22.key != &TOKEN_2022_ID || ata_program.key != &ATA_PROGRAM_ID {
        return Err(ProgramError::IncorrectProgramId);
    }
    let mut rec = load_owned(program_id, owner, record)?;
    if rec.card_mint != Pubkey::default() {
        return Err(RegistryError::CardAlreadyMinted.into());
    }
    let (pda, bump, hash) = card_pda(&rec.name, program_id);
    if &pda != card.key {
        return Err(ProgramError::InvalidSeeds);
    }
    let seeds: &[&[u8]] = &[CARD_SEED, &hash, &[bump]];

    // Mint account size: 165 base padding + 1 type byte + TLV entries.
    // MetadataPointer = 4 + 64; NonTransferable = 4 + 0.
    let mut space: usize = 166 + 68;
    if soulbound {
        space += 4;
    }
    // The TokenMetadata extension is realloc'd in by the token program; fund
    // rent for the final size up front (TLV 4 + fixed 64 + 3 strings + empty vec).
    let meta_len = 4 + 64 + (4 + rec.name.len()) + (4 + CARD_SYMBOL.len()) + (4 + rec.metadata_uri.len()) + 4;
    let rent = Rent::get()?;
    let final_lamports = rent.minimum_balance(space + meta_len);
    let create_lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            owner.key,
            card.key,
            create_lamports,
            space as u64,
            token22.key,
        ),
        &[owner.clone(), card.clone(), system.clone()],
        &[seeds],
    )?;

    // InitializeNonTransferableMint = tag 32 (soulbound only).
    if soulbound {
        invoke(
            &SolInstruction {
                program_id: TOKEN_2022_ID,
                accounts: vec![AccountMeta::new(*card.key, false)],
                data: vec![32u8],
            },
            &[card.clone()],
        )?;
    }

    // MetadataPointerExtension(39) / Initialize(0): authority + metadata = the mint itself.
    let mut mp = Vec::with_capacity(66);
    mp.extend_from_slice(&[39u8, 0u8]);
    mp.extend_from_slice(card.key.as_ref());
    mp.extend_from_slice(card.key.as_ref());
    invoke(
        &SolInstruction {
            program_id: TOKEN_2022_ID,
            accounts: vec![AccountMeta::new(*card.key, false)],
            data: mp,
        },
        &[card.clone()],
    )?;

    // InitializeMint2 = tag 20: decimals 0, mint authority = card PDA, no freeze authority.
    let mut im = Vec::with_capacity(67);
    im.push(20u8);
    im.push(0u8); // decimals
    im.extend_from_slice(card.key.as_ref());
    im.push(0u8); // freeze authority: COption::None
    invoke(
        &SolInstruction {
            program_id: TOKEN_2022_ID,
            accounts: vec![AccountMeta::new(*card.key, false)],
            data: im,
        },
        &[card.clone()],
    )?;

    // Fund the metadata realloc, then TokenMetadataInitialize (spl_token_metadata_interface).
    let topup = final_lamports.saturating_sub(card.lamports());
    if topup > 0 {
        invoke(
            &system_instruction::transfer(owner.key, card.key, topup),
            &[owner.clone(), card.clone(), system.clone()],
        )?;
    }
    let disc = hashv(&[b"spl_token_metadata_interface:initialize_account"]).to_bytes();
    let mut md = Vec::with_capacity(8 + 12 + rec.name.len() + CARD_SYMBOL.len() + rec.metadata_uri.len());
    md.extend_from_slice(&disc[..8]);
    borsh::to_writer(&mut md, &rec.name).map_err(|_| ProgramError::InvalidInstructionData)?;
    borsh::to_writer(&mut md, &CARD_SYMBOL.to_string()).map_err(|_| ProgramError::InvalidInstructionData)?;
    borsh::to_writer(&mut md, &rec.metadata_uri).map_err(|_| ProgramError::InvalidInstructionData)?;
    invoke_signed(
        &SolInstruction {
            program_id: TOKEN_2022_ID,
            accounts: vec![
                AccountMeta::new(*card.key, false),          // metadata (the mint)
                AccountMeta::new_readonly(*card.key, false), // update authority
                AccountMeta::new_readonly(*card.key, false), // mint
                AccountMeta::new_readonly(*card.key, true),  // mint authority (PDA signs)
            ],
            data: md,
        },
        &[card.clone()],
        &[seeds],
    )?;

    // Owner's ATA (CreateIdempotent = tag 1), then MintTo 1 and drop mint authority.
    invoke(
        &SolInstruction {
            program_id: ATA_PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*owner.key, true),
                AccountMeta::new(*owner_ata.key, false),
                AccountMeta::new_readonly(*owner.key, false),
                AccountMeta::new_readonly(*card.key, false),
                AccountMeta::new_readonly(system_program::ID, false),
                AccountMeta::new_readonly(TOKEN_2022_ID, false),
            ],
            data: vec![1u8],
        },
        &[
            owner.clone(),
            owner_ata.clone(),
            card.clone(),
            system.clone(),
            token22.clone(),
        ],
    )?;

    let mut mt = Vec::with_capacity(9);
    mt.push(7u8); // MintTo
    mt.extend_from_slice(&1u64.to_le_bytes());
    invoke_signed(
        &SolInstruction {
            program_id: TOKEN_2022_ID,
            accounts: vec![
                AccountMeta::new(*card.key, false),
                AccountMeta::new(*owner_ata.key, false),
                AccountMeta::new_readonly(*card.key, true),
            ],
            data: mt,
        },
        &[card.clone(), owner_ata.clone()],
        &[seeds],
    )?;

    // SetAuthority = tag 6, authority_type MintTokens = 0, new = COption::None.
    invoke_signed(
        &SolInstruction {
            program_id: TOKEN_2022_ID,
            accounts: vec![
                AccountMeta::new(*card.key, false),
                AccountMeta::new_readonly(*card.key, true),
            ],
            data: vec![6u8, 0u8, 0u8],
        },
        &[card.clone()],
        &[seeds],
    )?;

    rec.card_mint = *card.key;
    write_account(record, &rec)?;
    msg!("agentcard minted for {} (soulbound: {})", rec.name, soulbound);
    Ok(())
}

// ──────────────────────────────── config ──────────────────────────────────
fn init_config(program_id: &Pubkey, accounts: &[AccountInfo], params: ConfigParams) -> ProgramResult {
    let it = &mut accounts.iter();
    let admin = next_account_info(it)?;
    let config = next_account_info(it)?;
    let system = next_account_info(it)?;

    if !admin.is_signer || admin.key != &ADMIN {
        return Err(RegistryError::NotAdmin.into());
    }
    if system.key != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }
    if !config.data_is_empty() {
        return Err(ProgramError::AccountAlreadyInitialized);
    }
    let (pda, bump) = config_pda(program_id);
    if &pda != config.key {
        return Err(ProgramError::InvalidSeeds);
    }
    let rent = Rent::get()?;
    invoke_signed(
        &system_instruction::create_account(
            admin.key,
            config.key,
            rent.minimum_balance(CONFIG_SIZE),
            CONFIG_SIZE as u64,
            program_id,
        ),
        &[admin.clone(), config.clone(), system.clone()],
        &[&[CONFIG_SEED, &[bump]]],
    )?;
    let cfg = Config { version: 1, bump, params };
    write_account(config, &cfg)?;
    msg!("config initialized");
    Ok(())
}

fn update_config(program_id: &Pubkey, accounts: &[AccountInfo], params: ConfigParams) -> ProgramResult {
    let it = &mut accounts.iter();
    let admin = next_account_info(it)?;
    let config = next_account_info(it)?;
    if !admin.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    let mut cfg = load_config(program_id, config)?;
    if admin.key != &cfg.params.admin {
        return Err(RegistryError::NotAdmin.into());
    }
    cfg.params = params;
    write_account(config, &cfg)?;
    msg!("config updated");
    Ok(())
}

// ──────────────────────────────── helpers ─────────────────────────────────
fn load_owned(
    program_id: &Pubkey,
    owner: &AccountInfo,
    record: &AccountInfo,
) -> Result<NameRecord, ProgramError> {
    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if record.owner != program_id {
        return Err(ProgramError::IllegalOwner);
    }
    let rec = NameRecord::deserialize(&mut &record.data.borrow()[..])
        .map_err(|_| ProgramError::InvalidAccountData)?;
    if &rec.owner != owner.key {
        return Err(RegistryError::NotOwner.into());
    }
    Ok(rec)
}

fn write_account<T: BorshSerialize>(account: &AccountInfo, value: &T) -> ProgramResult {
    let mut data = account.try_borrow_mut_data()?;
    // zero then write so shorter strings can't leave stale trailing bytes
    for b in data.iter_mut() {
        *b = 0;
    }
    let mut cursor: &mut [u8] = &mut data;
    value
        .serialize(&mut cursor)
        .map_err(|_| ProgramError::AccountDataTooSmall)?;
    Ok(())
}
