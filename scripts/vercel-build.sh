#!/usr/bin/env bash
# Vercel build entry point. For preview deploys, fork a Xata branch off `main`
# and point DATABASE_URL at it so each PR gets isolated metadata storage.
# Production builds (main) fall through to a plain `next build` that reads the
# DATABASE_URL configured in the Vercel project.

set -euo pipefail

# Re-export the runtime env var names under the names the Xata CLI expects,
# so the same secrets configured for the app also drive the CLI here.
export XATA_ORGANIZATIONID="${XATA_ORG_ID}"
export XATA_PROJECTID="${XATA_MAIN_PROJECT_ID}"
export XATA_API_KEY="${XATA_VERCEL_API_KEY}"

if ! command -v xata >/dev/null 2>&1; then
  curl -fsSL https://xata.io/install.sh | bash
  export PATH="$HOME/.config/xata/bin:$PATH"
fi

xata version

if [[ "${VERCEL_ENV:-}" == "preview" && -n "${VERCEL_GIT_COMMIT_REF:-}" ]]; then
  # Sanitize the git ref into a legal Xata branch name (cap at 50 chars so
  # the "preview-" prefix still leaves room under Xata's 63-char limit).
  SAFE_REF=$(echo -n "$VERCEL_GIT_COMMIT_REF" | tr -c 'a-zA-Z0-9-_' '-' | cut -c1-50)
  BRANCH_NAME="preview-${SAFE_REF}"

  # Recreate from scratch on every push so the preview reflects the PR's
  # current schema + seed without drift across rebuilds.
  xata branch delete "$BRANCH_NAME" --yes || true
  xata branch create --name "$BRANCH_NAME" --parent-branch main
  xata branch wait-ready "$BRANCH_NAME"

  DSN=$(xata branch url "$BRANCH_NAME" --type primary)
  echo "DATABASE_URL=$DSN" >> .env.production

  DATABASE_URL="$DSN" npm run db:migrate
fi

npm run build
