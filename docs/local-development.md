# Local Development

Bliish.space is a Hono application at the repository root.

The app is server-rendered, form-first, SQLite-backed, and self-hosted. It does not require browser JavaScript or external APIs for auth, media, search, analytics, moderation, or storage.

## Local Setup

```bash
corepack enable
pnpm install
pnpm db:init
pnpm dev
```

Open `http://localhost:3000`. If another app is already using port 3000:

```bash
PORT=3123 pnpm dev
```

The account whose id matches `BLIISH_ADMIN_USER_ID` receives the `admin` role when it signs up. With the default environment, that is the first signed-up account. All users are kept as accepted friends with that protected admin account and cannot unfriend or block it.

When group id `1` exists, it is the default group: existing and new users are added automatically, users cannot leave it, and the group cannot be deleted.

After signing in as that account, open `/admin` to manage local branding, site copy, moderation, automod, rate limits, users, email outbox, audit logs, and database table counts without editing source files.

The app reads environment variables from the shell. If you copy `.env.example` for local overrides, source it before running commands:

```bash
set -a
. ./.env
set +a
pnpm dev
```

Useful checks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Runtime data lives under `data/` by default. SQLite files and user uploads are local state, not source files.

For a clean local reset, stop the dev server, delete `data/`, then run `pnpm db:init` again.

## Email

Verification, reset, and admin emails are always recorded in the local admin outbox. To also send them through SMTP, configure:

```bash
BLIISH_SMTP_HOST=smtp.example.com
BLIISH_SMTP_PORT=587
BLIISH_SMTP_USER=...
BLIISH_SMTP_PASSWORD=...
BLIISH_SMTP_FROM=noreply@example.com
```

Set `BLIISH_SMTP_SECURE=1` for implicit TLS, usually port 465. Set `BLIISH_SMTP_STARTTLS=0` only for servers that do not support STARTTLS.
