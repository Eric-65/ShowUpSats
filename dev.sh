#!/usr/bin/env bash
# One command: install, create DB, seed, run.
set -euo pipefail
[ -f .env ] || { cp .env.example .env; \
  sed -i.bak "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$(openssl rand -base64 32)|" .env; \
  NSEC=$(node -e "const{generateSecretKey}=require('nostr-tools/pure');" 2>/dev/null || true); rm -f .env.bak; }
pnpm i
grep -q '^APP_NOSTR_NSEC=nsec' .env || { NSEC=$(node -e "const{generateSecretKey}=require('nostr-tools/pure');const{nsecEncode}=require('nostr-tools/nip19');console.log(nsecEncode(generateSecretKey()))"); sed -i.bak "s|^APP_NOSTR_NSEC=.*|APP_NOSTR_NSEC=$NSEC|" .env; rm -f .env.bak; }
pnpm db:push
pnpm seed
pnpm dev
