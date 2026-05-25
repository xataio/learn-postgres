#!/usr/bin/env bash
# Vercel build entry point. For preview deploys, fork a Xata branch off `main`
# and point DATABASE_URL at it so each PR gets isolated metadata storage.
# Production builds (main) fall through to a plain `next build` that reads the
# DATABASE_URL configured in the Vercel project.

set -euox pipefail

if [[ "${VERCEL_ENV:-}" == "preview" && -n "${VERCEL_GIT_COMMIT_REF:-}" ]]; then
  # The CLI reads XATA_API_KEY directly from the env; org/project come in via flags.
  export XATA_API_KEY="$XATA_VERCEL_API_KEY"

  if ! command -v xata >/dev/null 2>&1; then
    curl -fsSL https://xata.io/install.sh | bash
    export PATH="$HOME/.config/xata/bin:$PATH"
  fi

  xata version

  # Sanitize the git ref into a legal Xata branch name (cap at 50 chars so
  # the "preview-" prefix still leaves room under Xata's 63-char limit).
  SAFE_REF=$(echo -n "$VERCEL_GIT_COMMIT_REF" | tr -c 'a-zA-Z0-9-_' '-' | cut -c1-50)
  BRANCH_NAME="preview-${SAFE_REF}"

  XATA_FLAGS=(--organization "$XATA_ORG_ID" --project "$XATA_MAIN_PROJECT_ID")

  # Recreate from scratch on every push so the preview reflects the PR's
  # current schema + seed without drift across rebuilds.
  xata branch delete "$BRANCH_NAME" "${XATA_FLAGS[@]}" --yes || true
  xata branch create --name "$BRANCH_NAME" "${XATA_FLAGS[@]}" --parent-branch $XATA_MAIN_BRANCH_ID
  xata branch wait-ready "$BRANCH_NAME" "${XATA_FLAGS[@]}"

  DSN=$(xata branch url "$BRANCH_NAME" --type primary "${XATA_FLAGS[@]}")
  echo "DATABASE_URL=$DSN" >> .env.production

  DATABASE_URL="$DSN" npm run db:migrate
fi

# Pre-seed per-lesson template branches in the sandbox project so user sandboxes
# fork from them instead of seeding per request. Runs for both prod and preview.
# Fatal by design (set -e): never ship a lesson without its template. Requires
# XATA_API_KEY / XATA_ORG_ID / XATA_PROJECT_ID (the sandbox project) in the env.
npm run templates:prepare

npm run build
