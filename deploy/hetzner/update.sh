#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/hetzner/lib.sh
. "$DEPLOY_DIR/lib.sh"
load_optional_production_env

BLIISH_SERVER_NAME="${BLIISH_SERVER_NAME:-bliishspace-1}"
BLIISH_SSH_USER="${BLIISH_SSH_USER:-root}"
BLIISH_DEPLOY_SSH_KEY="${BLIISH_DEPLOY_SSH_KEY:-$HOME/.ssh/bliishspace-deploy}"
BLIISH_REPOSITORY_REF="${BLIISH_REPOSITORY_REF:-main}"

require_repository_ref BLIISH_REPOSITORY_REF "$BLIISH_REPOSITORY_REF"

# Resolve the host through hcloud unless the operator provided BLIISH_SSH_HOST.
if [ -z "${BLIISH_SSH_HOST:-}" ]; then
  require_command hcloud
  BLIISH_SSH_HOST="$(hcloud server ip "$BLIISH_SERVER_NAME")"
fi

require_command ssh

ssh_args=()
if [ -r "$BLIISH_DEPLOY_SSH_KEY" ]; then
  ssh_args+=(-i "$BLIISH_DEPLOY_SSH_KEY")
fi

# Run deploy steps in one SSH session so failures are easier to diagnose.
ssh "${ssh_args[@]}" "$BLIISH_SSH_USER@$BLIISH_SSH_HOST" 'bash -s' -- "$BLIISH_REPOSITORY_REF" <<'REMOTE'
set -euo pipefail

repository_ref="$1"

run_as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

run_as_bliish() {
  if [ "$(id -u)" -eq 0 ]; then
    runuser -u bliish -- "$@"
  else
    sudo -u bliish -H "$@"
  fi
}

# Update the configured ref, rebuild, ensure schema objects exist, and restart systemd.
run_as_root git -C /opt/bliishspace fetch --prune --tags origin
if run_as_root git -C /opt/bliishspace rev-parse --verify --quiet "refs/remotes/origin/$repository_ref" >/dev/null; then
  run_as_root git -C /opt/bliishspace checkout -B "$repository_ref" "origin/$repository_ref"
else
  run_as_root git -C /opt/bliishspace checkout "$repository_ref"
fi

cd /opt/bliishspace
PNPM_PACKAGE_MANAGER="$(node -p "require('./package.json').packageManager || 'pnpm@11.1.3'")"
run_as_root corepack enable
run_as_root corepack prepare "$PNPM_PACKAGE_MANAGER" --activate
run_as_root pnpm install --frozen-lockfile
run_as_root pnpm build
run_as_bliish bash -lc 'set -a; . /etc/bliishspace.env; set +a; cd /opt/bliishspace; pnpm db:init'
run_as_root systemctl restart bliishspace
run_as_root systemctl status bliishspace --no-pager
REMOTE
