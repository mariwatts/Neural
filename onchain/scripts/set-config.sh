#!/usr/bin/env bash
# Inject the real program id + treasury wallet into src/lib.rs before building.
#   bash scripts/set-config.sh <PROGRAM_ID> <TREASURY_PUBKEY>
set -euo pipefail

PROGRAM_ID="${1:?usage: set-config.sh <PROGRAM_ID> <TREASURY_PUBKEY>}"
TREASURY="${2:?usage: set-config.sh <PROGRAM_ID> <TREASURY_PUBKEY>}"
LIB="$(dirname "$0")/../src/lib.rs"

sed -i -E "s/declare_id!\(\"[^\"]+\"\)/declare_id!(\"${PROGRAM_ID}\")/" "$LIB"
sed -i -E "s/const TREASURY: Pubkey = solana_program::pubkey!\(\"[^\"]+\"\)/const TREASURY: Pubkey = solana_program::pubkey!(\"${TREASURY}\")/" "$LIB"

echo "set program id   -> ${PROGRAM_ID}"
echo "set treasury     -> ${TREASURY}"
grep -nE "declare_id!|const TREASURY" "$LIB"
