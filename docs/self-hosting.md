# Self-Hosting

Bliish.space runs as one Node process with one SQLite database and one upload directory.

## Who This Is For

These notes are for both the Bliish maintainers and independent operators. The production process is the same; only the domain name and source repository change.

- Official maintainers deploy `bliish.space` from `bliish-com/bliishspace`.
- Independent operators deploy their own domain from their own public fork or copy if they want GitHub auto-deploys.
- Operators who do not want GitHub auto-deploys can deploy the upstream repository directly and run updates manually.

For GitHub auto-deploys, use a repository you control. The deployment helper writes environment secrets and variables to that repository, so a self-hoster normally needs a fork. Keep the fork public unless you intentionally extend the VPS bootstrap with private Git credentials.

## Requirements

- Node.js 24 LTS or newer.
- pnpm through Corepack.
- A writable data directory.
- A reverse proxy with TLS for public deployments.

## Local Setup

```bash
corepack enable
pnpm install
pnpm db:init
pnpm dev
```

Open `http://localhost:3000`.

## Configuration

Copy `.env.example` if you want a local starting point, then adjust values for the instance:

```env
BLIISH_BASE_URL=https://bliish.space
BLIISH_DATABASE_PATH=./data/bliish.sqlite
BLIISH_UPLOAD_DIR=./data/uploads
BLIISH_ADMIN_USER_ID=1
BLIISH_MEDIA_CONCURRENCY=1
PORT=3000
HOST=127.0.0.1
```

The app does not auto-load `.env` files. Source that file in your shell or process manager before running app commands.

If these variables are unset, the app defaults to `http://localhost:3000`, `./data/bliish.sqlite`, `./data/uploads`, admin user id `1`, media concurrency `1`, port `3000`, and host `0.0.0.0`. The account that signs up with `BLIISH_ADMIN_USER_ID` receives the `admin` role, and all users are kept as accepted friends with that protected admin account.

When group id `1` exists, it is the default group. Existing and new users are added automatically, users cannot leave it, and the group cannot be deleted.

The default app does not require cloud credentials or an email provider. Password reset and verification messages are written to the local email outbox visible to admins.

`BLIISH_UPLOAD_DIR` controls where uploads are written. Public user media is served only from the profile-image, post-image, and theme-song buckets at `/media/pfp/*`, `/media/post-images/*`, and `/media/theme-songs/*`. Keep the upload directory on persistent storage and include it in backups.

Uploaded user images are normalized locally before storage. `BLIISH_MEDIA_CONCURRENCY` controls sharp/libvips worker concurrency and defaults to `1`, which keeps memory and CPU predictable on small VPS instances.

## Admin Console

After the admin account signs in, open `/admin` to manage the instance without editing source code.

Admins can manage users, reports, automod rules, rate limits, site identity, home page text, contact and legal details, announcements, color theme, blog cleanup, favorites cleanup, the local email outbox, database table counts, and the audit log. Moderators can use `/moderation/reports` for report handling.

Admin-managed instance settings are runtime data, not source files. They are stored in the SQLite database, so updating application code should not overwrite them. The defaults in the repository are fallbacks for a fresh database or an intentional reset.

## Production Process

Build and run:

```bash
pnpm install --frozen-lockfile
pnpm db:init
pnpm build
pnpm start
```

Use a process manager such as systemd, OpenRC, runit, s6, or Docker if that fits the operator environment. Docker should remain optional.

## Provider Recipes

- [Hetzner Cloud CLI](deployment/hetzner-cloud-cli.md)
- [Hetzner Cloud manual VPS](deployment/hetzner-cloud.md)

For GitHub-based auto-deploys, self-hosters should fork or copy the repository first. The VPS pulls code from `BLIISH_REPOSITORY_URL`, and `setup-github.sh` writes deploy secrets to `BLIISH_GITHUB_REPOSITORY`, so those values should point at a repository the operator controls.

For manual updates without GitHub deploys, a self-hoster may keep `BLIISH_REPOSITORY_URL=https://github.com/bliish-com/bliishspace.git`, skip `setup-github.sh`, and run the update command from the deployment guide when they want to pull upstream.

## Reverse Proxy

Terminate TLS at the reverse proxy and forward to the local app port.

Example nginx shape:

```nginx
server {
  server_name bliish.space;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

## Backups

Back up both:

- the SQLite database;
- the upload directory.

The SQLite database includes users, posts, moderation records, and admin branding/settings. The upload directory includes profile images, post images, and theme songs.

For a small instance, the simplest backup is:

1. Stop the app.
2. Copy `data/bliish.sqlite`.
3. Copy `data/uploads/`.
4. Start the app.

For live backups, use SQLite's backup tooling or a filesystem snapshot that handles WAL files correctly.

```bash
sqlite3 data/bliish.sqlite ".backup 'backup/bliish.sqlite'"
```

## Restore

1. Stop the app.
2. Restore the SQLite database file.
3. Restore `data/uploads/`.
4. Check ownership and permissions.
5. Start the app.
6. Open `/home`, `/u/<handle>`, and `/account/export.json` for a smoke test.

## Operational Notes

- Keep the database and uploads out of the public repository.
- Keep `BLIISH_BASE_URL` accurate so secure cookies work behind TLS.
- Do not put uploads on a filesystem that silently drops writes.
- Monitor disk usage.
- Keep OS packages patched.
- Publish instance-specific privacy, moderation, and backup policies.
