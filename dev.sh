#!/usr/bin/env bash
# One command from a fresh clone: install → create DB → seed → run.
set -euo pipefail
pnpm i
if [ ! -f .env ]; then
  cp .env.example .env
  KEY=$(openssl rand -base64 32)
  NSEC=$(node -e "const{generateSecretKey}=require('nostr-tools/pure');const{nsecEncode}=require('nostr-tools/nip19');console.log(nsecEncode(generateSecretKey()))")
  node -e "const fs=require('fs');let e=fs.readFileSync('.env','utf8');e=e.replace(/^ENCRYPTION_KEY=.*$/m,'ENCRYPTION_KEY=$KEY').replace(/^APP_NOSTR_NSEC=.*$/m,'APP_NOSTR_NSEC=$NSEC');fs.writeFileSync('.env',e)"
  echo "Created .env with a fresh ENCRYPTION_KEY and APP_NOSTR_NSEC."
fi
pnpm db:push
pnpm seed
pnpm dev
