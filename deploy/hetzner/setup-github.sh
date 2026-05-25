#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/hetzner/lib.sh
. "$DEPLOY_DIR/lib.sh"
load_required_production_env

require_command gh
require_command ssh-keyscan

BLIISH_DOMAIN="$(normalize_domain "${BLIISH_DOMAIN:-bliish.space}")"
BLIISH_BASE_URL="${BLIISH_BASE_URL:-https://$BLIISH_DOMAIN}"
BLIISH_SERVER_NAME="${BLIISH_SERVER_NAME:-bliishspace-1}"
BLIISH_DEPLOY_SSH_KEY="${BLIISH_DEPLOY_SSH_KEY:-$HOME/.ssh/bliishspace-deploy}"
BLIISH_SSH_USER="${BLIISH_SSH_USER:-root}"
BLIISH_REPOSITORY_REF="${BLIISH_REPOSITORY_REF:-main}"
BLIISH_GITHUB_REPOSITORY="${BLIISH_GITHUB_REPOSITORY:-bliish-com/bliishspace}"
BLIISH_GITHUB_ENVIRONMENT="${BLIISH_GITHUB_ENVIRONMENT:-production}"

require_repository_ref BLIISH_REPOSITORY_REF "$BLIISH_REPOSITORY_REF"

if [ ! -r "$BLIISH_DEPLOY_SSH_KEY" ]; then
  echo "Deploy SSH private key not found: $BLIISH_DEPLOY_SSH_KEY" >&2
  echo "Run deploy/hetzner/provision.sh first, or set BLIISH_DEPLOY_SSH_KEY." >&2
  exit 1
fi

if [ -z "${BLIISH_SSH_HOST:-}" ]; then
  require_command hcloud
  BLIISH_SSH_HOST="$(hcloud server ip "$BLIISH_SERVER_NAME")"
fi

known_hosts="$(ssh-keyscan -T 10 "$BLIISH_SSH_HOST" 2>/dev/null || true)"
if [ -z "$known_hosts" ] && [ -n "$BLIISH_DOMAIN" ] && [ "$BLIISH_DOMAIN" != "$BLIISH_SSH_HOST" ]; then
  known_hosts="$(ssh-keyscan -T 10 "$BLIISH_DOMAIN" 2>/dev/null || true)"
fi

if [ -z "$known_hosts" ]; then
  echo "Could not collect SSH host keys for $BLIISH_SSH_HOST." >&2
  echo "Check that the server is reachable on port 22, then rerun this script." >&2
  exit 1
fi

if ! gh api --method PUT "repos/$BLIISH_GITHUB_REPOSITORY/environments/$BLIISH_GITHUB_ENVIRONMENT" --silent; then
  echo "Could not create or update GitHub environment $BLIISH_GITHUB_ENVIRONMENT in $BLIISH_GITHUB_REPOSITORY." >&2
  echo "Check that BLIISH_GITHUB_REPOSITORY points to a repository you control and that gh is authenticated with admin access." >&2
  exit 1
fi

gh secret set BLIISH_DEPLOY_SSH_PRIVATE_KEY \
  --repo "$BLIISH_GITHUB_REPOSITORY" \
  --env "$BLIISH_GITHUB_ENVIRONMENT" \
  < "$BLIISH_DEPLOY_SSH_KEY"

printf "%s\n" "$known_hosts" | gh secret set BLIISH_DEPLOY_KNOWN_HOSTS \
  --repo "$BLIISH_GITHUB_REPOSITORY" \
  --env "$BLIISH_GITHUB_ENVIRONMENT"

gh variable set BLIISH_BASE_URL \
  --repo "$BLIISH_GITHUB_REPOSITORY" \
  --env "$BLIISH_GITHUB_ENVIRONMENT" \
  --body "$BLIISH_BASE_URL"

gh variable set BLIISH_SSH_HOST \
  --repo "$BLIISH_GITHUB_REPOSITORY" \
  --env "$BLIISH_GITHUB_ENVIRONMENT" \
  --body "$BLIISH_SSH_HOST"

gh variable set BLIISH_SSH_USER \
  --repo "$BLIISH_GITHUB_REPOSITORY" \
  --env "$BLIISH_GITHUB_ENVIRONMENT" \
  --body "$BLIISH_SSH_USER"

gh variable set BLIISH_REPOSITORY_REF \
  --repo "$BLIISH_GITHUB_REPOSITORY" \
  --env "$BLIISH_GITHUB_ENVIRONMENT" \
  --body "$BLIISH_REPOSITORY_REF"

cat <<EOF
Configured GitHub production deploys for $BLIISH_GITHUB_REPOSITORY.

Environment: $BLIISH_GITHUB_ENVIRONMENT
URL: $BLIISH_BASE_URL
SSH target: $BLIISH_SSH_USER@$BLIISH_SSH_HOST
Ref: $BLIISH_REPOSITORY_REF

Push to main after DNS and first boot are healthy.
EOF
