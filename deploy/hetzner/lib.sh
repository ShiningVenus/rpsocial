#!/usr/bin/env bash

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$DEPLOY_DIR/../.." && pwd)"
ENV_FILE="${BLIISH_PRODUCTION_ENV_FILE:-$DEPLOY_DIR/production.env}"

load_optional_production_env() {
  if [ -r "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    . "$ENV_FILE"
  fi
}

load_required_production_env() {
  if [ -r "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    return
  fi

  echo "Production env file not found: $ENV_FILE" >&2
  echo "Copy deploy/hetzner/production.env.example to deploy/hetzner/production.env first." >&2
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

escape_sed_replacement() {
  printf "%s" "$1" | sed -e 's/[\/&|\\]/\\&/g'
}

require_no_control_chars() {
  case "$2" in
    *$'\n'*|*$'\r'*|*$'\t'*)
      echo "$1 must not contain control characters" >&2
      exit 1
      ;;
  esac
}

require_simple_token() {
  local name="$1"
  local value="$2"
  local pattern="$3"

  if [[ ! "$value" =~ $pattern ]]; then
    echo "$name has an unsupported value: $value" >&2
    exit 1
  fi
}

require_repository_ref() {
  require_no_control_chars "$1" "$2"
  case "$2" in
    *[[:space:]\\]*)
      echo "$1 must not contain whitespace or backslashes" >&2
      exit 1
      ;;
  esac
  require_simple_token "$1" "$2" '^[A-Za-z0-9][A-Za-z0-9._/-]*$'
}

normalize_domain() {
  local domain="$1"
  domain="${domain#http://}"
  domain="${domain#https://}"
  domain="${domain%%/*}"
  printf "%s" "$domain"
}
