#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/hetzner/lib.sh
. "$DEPLOY_DIR/lib.sh"
load_optional_production_env

render_cloud_init() {
  sed \
    -e "s|__BLIISH_DOMAIN__|$(escape_sed_replacement "$BLIISH_DOMAIN")|g" \
    -e "s|__BLIISH_BASE_URL__|$(escape_sed_replacement "$BLIISH_BASE_URL")|g" \
    -e "s|__BLIISH_REPOSITORY_URL__|$(escape_sed_replacement "$BLIISH_REPOSITORY_URL")|g" \
    -e "s|__BLIISH_REPOSITORY_REF__|$(escape_sed_replacement "$BLIISH_REPOSITORY_REF")|g" \
    -e "s|__BLIISH_ADMIN_USER_ID__|$(escape_sed_replacement "$BLIISH_ADMIN_USER_ID")|g" \
    -e "s|__BLIISH_MEDIA_CONCURRENCY__|$(escape_sed_replacement "$BLIISH_MEDIA_CONCURRENCY")|g" \
    -e "s|__BLIISH_NODE_MAJOR__|$(escape_sed_replacement "$BLIISH_NODE_MAJOR")|g" \
    "$DEPLOY_DIR/cloud-init.yml" > "$USER_DATA_FILE"
}

# Check local tooling before touching Hetzner resources.
require_command hcloud
require_command sed
require_command mktemp

# Operator-overridable defaults. The deployment guide documents each one.
BLIISH_SERVER_NAME="${BLIISH_SERVER_NAME:-bliishspace-1}"
BLIISH_HCLOUD_SERVER_TYPE="${BLIISH_HCLOUD_SERVER_TYPE:-cx23}"
BLIISH_HCLOUD_IMAGE="${BLIISH_HCLOUD_IMAGE:-ubuntu-24.04}"
BLIISH_HCLOUD_LOCATION="${BLIISH_HCLOUD_LOCATION:-nbg1}"
BLIISH_HCLOUD_ENABLE_IPV4="${BLIISH_HCLOUD_ENABLE_IPV4:-true}"
BLIISH_DEPLOY_SSH_KEY="${BLIISH_DEPLOY_SSH_KEY:-$HOME/.ssh/bliishspace-deploy}"
BLIISH_HCLOUD_SSH_KEY_NAME="${BLIISH_HCLOUD_SSH_KEY_NAME:-bliishspace-admin}"
BLIISH_HCLOUD_SSH_PUBLIC_KEY="${BLIISH_HCLOUD_SSH_PUBLIC_KEY:-$BLIISH_DEPLOY_SSH_KEY.pub}"
BLIISH_HCLOUD_FIREWALL_NAME="${BLIISH_HCLOUD_FIREWALL_NAME:-bliishspace-web}"
BLIISH_HCLOUD_FIREWALL_RULES="${BLIISH_HCLOUD_FIREWALL_RULES:-$DEPLOY_DIR/firewall-rules.json}"
BLIISH_REPOSITORY_URL="${BLIISH_REPOSITORY_URL:-https://github.com/bliish-com/bliishspace.git}"
BLIISH_REPOSITORY_REF="${BLIISH_REPOSITORY_REF:-main}"
BLIISH_ADMIN_USER_ID="${BLIISH_ADMIN_USER_ID:-1}"
BLIISH_MEDIA_CONCURRENCY="${BLIISH_MEDIA_CONCURRENCY:-1}"
BLIISH_NODE_MAJOR="${BLIISH_NODE_MAJOR:-24}"
BLIISH_HCLOUD_ENABLE_BACKUPS="${BLIISH_HCLOUD_ENABLE_BACKUPS:-false}"
BLIISH_HCLOUD_ENABLE_DELETE_PROTECTION="${BLIISH_HCLOUD_ENABLE_DELETE_PROTECTION:-true}"

# Accept either BLIISH_DOMAIN or a full BLIISH_BASE_URL, then normalize them for
# cloud-init and Caddy.
if [ -z "${BLIISH_DOMAIN:-}" ] && [ -n "${BLIISH_BASE_URL:-}" ]; then
  BLIISH_DOMAIN="$(normalize_domain "$BLIISH_BASE_URL")"
fi

if [ -z "${BLIISH_DOMAIN:-}" ]; then
  echo "Set BLIISH_DOMAIN, for example: BLIISH_DOMAIN=bliish.space deploy/hetzner/provision.sh" >&2
  exit 1
fi

BLIISH_DOMAIN="$(normalize_domain "$BLIISH_DOMAIN")"
BLIISH_BASE_URL="${BLIISH_BASE_URL:-https://$BLIISH_DOMAIN}"
USER_DATA_FILE="${BLIISH_HCLOUD_USER_DATA_FILE:-$(mktemp "${TMPDIR:-/tmp}/bliishspace-cloud-init.XXXXXX")}"
EXPECTED_BLIISH_BASE_URL="https://$BLIISH_DOMAIN"

# These values are interpolated into cloud-init, so reject control characters
# and shell-sensitive tokens before rendering the template.
require_no_control_chars BLIISH_DOMAIN "$BLIISH_DOMAIN"
require_no_control_chars BLIISH_BASE_URL "$BLIISH_BASE_URL"
require_no_control_chars BLIISH_HCLOUD_LOCATION "$BLIISH_HCLOUD_LOCATION"
require_no_control_chars BLIISH_HCLOUD_SERVER_TYPE "$BLIISH_HCLOUD_SERVER_TYPE"
require_no_control_chars BLIISH_HCLOUD_IMAGE "$BLIISH_HCLOUD_IMAGE"
require_no_control_chars BLIISH_REPOSITORY_URL "$BLIISH_REPOSITORY_URL"
require_no_control_chars BLIISH_REPOSITORY_REF "$BLIISH_REPOSITORY_REF"
require_no_control_chars BLIISH_ADMIN_USER_ID "$BLIISH_ADMIN_USER_ID"
require_no_control_chars BLIISH_MEDIA_CONCURRENCY "$BLIISH_MEDIA_CONCURRENCY"
require_no_control_chars BLIISH_NODE_MAJOR "$BLIISH_NODE_MAJOR"
require_simple_token BLIISH_DOMAIN "$BLIISH_DOMAIN" '^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$'
require_simple_token BLIISH_HCLOUD_LOCATION "$BLIISH_HCLOUD_LOCATION" '^[a-z0-9][a-z0-9-]*$'
require_simple_token BLIISH_HCLOUD_SERVER_TYPE "$BLIISH_HCLOUD_SERVER_TYPE" '^[A-Za-z0-9][A-Za-z0-9._-]*$'
require_simple_token BLIISH_HCLOUD_IMAGE "$BLIISH_HCLOUD_IMAGE" '^[A-Za-z0-9][A-Za-z0-9._-]*$'
require_simple_token BLIISH_ADMIN_USER_ID "$BLIISH_ADMIN_USER_ID" '^[0-9]+$'
require_simple_token BLIISH_MEDIA_CONCURRENCY "$BLIISH_MEDIA_CONCURRENCY" '^[1-8]$'
require_simple_token BLIISH_NODE_MAJOR "$BLIISH_NODE_MAJOR" '^[0-9]+$'

case "$BLIISH_BASE_URL" in
  https://*) ;;
  *)
    echo "BLIISH_BASE_URL must use https:// for this production deployment path" >&2
    exit 1
    ;;
esac

if [ "$BLIISH_BASE_URL" != "$EXPECTED_BLIISH_BASE_URL" ]; then
  echo "BLIISH_BASE_URL must exactly match $EXPECTED_BLIISH_BASE_URL" >&2
  exit 1
fi

case "$BLIISH_REPOSITORY_URL" in
  -*)
    echo "BLIISH_REPOSITORY_URL must not start with '-'" >&2
    exit 1
    ;;
  *[[:space:]\\]*)
    echo "BLIISH_REPOSITORY_URL must not contain whitespace or backslashes" >&2
    exit 1
    ;;
esac

require_simple_token BLIISH_REPOSITORY_URL "$BLIISH_REPOSITORY_URL" '^[A-Za-z0-9][A-Za-z0-9.+:/_@~=-]*$'
require_repository_ref BLIISH_REPOSITORY_REF "$BLIISH_REPOSITORY_REF"

# Reuse the shared SSH key and firewall, but never provision over an existing
# server.
if [ ! -r "$BLIISH_DEPLOY_SSH_KEY" ] && [ ! -r "$BLIISH_HCLOUD_SSH_PUBLIC_KEY" ]; then
  require_command ssh-keygen
  install -d -m 0700 "$(dirname "$BLIISH_DEPLOY_SSH_KEY")"
  ssh-keygen -t ed25519 -f "$BLIISH_DEPLOY_SSH_KEY" -N "" -C "bliishspace-deploy"
fi

if [ ! -r "$BLIISH_HCLOUD_SSH_PUBLIC_KEY" ] && [ -r "$BLIISH_DEPLOY_SSH_KEY" ]; then
  require_command ssh-keygen
  ssh-keygen -y -f "$BLIISH_DEPLOY_SSH_KEY" > "$BLIISH_HCLOUD_SSH_PUBLIC_KEY"
fi

if [ ! -r "$BLIISH_HCLOUD_SSH_PUBLIC_KEY" ]; then
  echo "SSH public key not found: $BLIISH_HCLOUD_SSH_PUBLIC_KEY" >&2
  exit 1
fi

if [ ! -r "$BLIISH_HCLOUD_FIREWALL_RULES" ]; then
  echo "Firewall rules file not found: $BLIISH_HCLOUD_FIREWALL_RULES" >&2
  exit 1
fi

if hcloud server describe "$BLIISH_SERVER_NAME" >/dev/null 2>&1; then
  echo "Server already exists: $BLIISH_SERVER_NAME" >&2
  echo "Use deploy/hetzner/update.sh for application updates." >&2
  exit 1
fi

if ! hcloud ssh-key describe "$BLIISH_HCLOUD_SSH_KEY_NAME" >/dev/null 2>&1; then
  hcloud ssh-key create \
    --name "$BLIISH_HCLOUD_SSH_KEY_NAME" \
    --label "app=bliishspace" \
    --public-key-from-file "$BLIISH_HCLOUD_SSH_PUBLIC_KEY"
fi

if ! hcloud firewall describe "$BLIISH_HCLOUD_FIREWALL_NAME" >/dev/null 2>&1; then
  hcloud firewall create \
    --name "$BLIISH_HCLOUD_FIREWALL_NAME" \
    --label "app=bliishspace" \
    --rules-file "$BLIISH_HCLOUD_FIREWALL_RULES"
fi

render_cloud_init

# Keep optional hcloud flags in an array to avoid word splitting.
create_args=(
  server create
  --name "$BLIISH_SERVER_NAME"
  --type "$BLIISH_HCLOUD_SERVER_TYPE"
  --image "$BLIISH_HCLOUD_IMAGE"
  --location "$BLIISH_HCLOUD_LOCATION"
  --ssh-key "$BLIISH_HCLOUD_SSH_KEY_NAME"
  --firewall "$BLIISH_HCLOUD_FIREWALL_NAME"
  --label "app=bliishspace"
  --user-data-from-file "$USER_DATA_FILE"
)

case "$BLIISH_HCLOUD_ENABLE_IPV4" in
  0|false|FALSE|no|NO)
    create_args+=(--without-ipv4)
    ;;
esac

case "$BLIISH_HCLOUD_ENABLE_BACKUPS" in
  1|true|TRUE|yes|YES)
    create_args+=(--enable-backup)
    ;;
esac

case "$BLIISH_HCLOUD_ENABLE_DELETE_PROTECTION" in
  1|true|TRUE|yes|YES)
    create_args+=(--enable-protection delete --enable-protection rebuild)
    ;;
esac

hcloud "${create_args[@]}"

server_ip="$(hcloud server ip "$BLIISH_SERVER_NAME")"

# Print the DNS and first-boot checks operators usually need next.
cat <<EOF

Created $BLIISH_SERVER_NAME at $server_ip.

Next:
1. Point DNS A/AAAA records for $BLIISH_DOMAIN at the server IP.
2. Wait for first boot setup:
   ssh root@$server_ip 'cloud-init status --wait'
3. Check the app:
   ssh root@$server_ip 'systemctl status bliishspace --no-pager'
   ssh root@$server_ip 'journalctl -u bliishspace -n 100 --no-pager'

Rendered cloud-init: $USER_DATA_FILE
EOF
