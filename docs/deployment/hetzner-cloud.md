# Hetzner Cloud Deployment

This guide deploys Bliish.space on a single Hetzner Cloud VPS with systemd, Caddy, one SQLite database, and one local upload directory.

For a shorter `hcloud` and cloud-init flow, see [Hetzner Cloud CLI Deployment](hetzner-cloud-cli.md).

## Server Shape

Recommended starting point:

- Ubuntu or Debian LTS.
- Hetzner `cx23` in `nbg1` for the recommended small German VPS target. With controlled uploads and normal social activity, this is a practical starting point for roughly 10k-50k registered accounts and 1k-5k daily active users.
- A persistent disk large enough for the SQLite database, uploads, logs, and backups.
- A domain name pointed at the server.

## Firewall

Allow only:

- SSH: `22/tcp`, ideally restricted to trusted IPs.
- HTTP: `80/tcp`.
- HTTPS: `443/tcp`.

Use Hetzner Cloud Firewall, the server firewall, or both.

## System Packages

```bash
sudo apt update
sudo apt install -y ca-certificates curl git sqlite3 build-essential python3 caddy
```

Install Node.js 24 LTS using your preferred Node distribution method. Then enable pnpm through Corepack:

```bash
corepack enable
node --version
pnpm --version
```

## Service User And Directories

```bash
sudo useradd --system --create-home --home-dir /var/lib/bliishspace --shell /usr/sbin/nologin bliish
sudo install -d -o bliish -g bliish /var/lib/bliishspace
sudo install -d -o bliish -g bliish /var/lib/bliishspace/uploads
sudo install -d -o root -g root /opt/bliishspace
```

## Application Code

Clone or copy the repository to `/opt/bliishspace`. Official maintainers use the upstream repository. Self-hosters can use their own public fork if they want the server to track their GitHub copy.

```bash
sudo git clone https://github.com/bliish-com/bliishspace.git /opt/bliishspace
sudo chown -R root:root /opt/bliishspace
```

For a fork, replace the clone URL with your repository URL. Private repositories need additional Git credentials and are outside the simple deployment path.

Install dependencies and build:

```bash
cd /opt/bliishspace
pnpm install --frozen-lockfile
pnpm build
```

## Environment File

Create `/etc/bliishspace.env`. Replace `bliish.space` with your own domain when running an independent instance:

```env
BLIISH_BASE_URL=https://bliish.space
BLIISH_DATABASE_PATH=/var/lib/bliishspace/bliish.sqlite
BLIISH_UPLOAD_DIR=/var/lib/bliishspace/uploads
BLIISH_ADMIN_USER_ID=1
BLIISH_MEDIA_CONCURRENCY=1
HOST=127.0.0.1
PORT=3000
```

Lock down the file:

```bash
sudo chown root:bliish /etc/bliishspace.env
sudo chmod 0640 /etc/bliishspace.env
```

Initialize the database:

```bash
sudo -u bliish -H bash -lc 'set -a; . /etc/bliishspace.env; set +a; cd /opt/bliishspace; pnpm db:init'
```

The account that signs up with `BLIISH_ADMIN_USER_ID` receives the `admin` role. With the default value, sign up the first account before opening the instance to others. All users are kept as accepted friends with that protected admin account and cannot unfriend or block it.

When group id `1` exists, it is the default group: existing and new users are added automatically, users cannot leave it, and the group cannot be deleted.

After signing in as the admin account, open `/admin` to manage branding, home page copy, contact details, announcements, moderation, automod, rate limits, users, email outbox, audit logs, and database table counts without editing source files.

Admin branding and instance settings are stored in the SQLite database. The defaults in the repository are only used for a fresh database or an intentional reset.

## systemd

Create `/etc/systemd/system/bliishspace.service`:

```ini
[Unit]
Description=Bliish.space
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=bliish
Group=bliish
WorkingDirectory=/opt/bliishspace
EnvironmentFile=/etc/bliishspace.env
ExecStart=/usr/bin/node /opt/bliishspace/dist/index.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectHome=true
ProtectSystem=strict
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
SystemCallArchitectures=native
ReadWritePaths=/var/lib/bliishspace

[Install]
WantedBy=multi-user.target
```

Start the app:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bliishspace
sudo systemctl status bliishspace
```

Logs:

```bash
sudo journalctl -u bliishspace -f
```

## Caddy

Create a Caddy site for the app:

```caddyfile
bliish.space {
  reverse_proxy 127.0.0.1:3000
}
```

If using Debian/Ubuntu's packaged Caddy, this usually belongs in `/etc/caddy/Caddyfile`.

Caddy handles HTTPS automatically once DNS points at the server and ports 80/443 are reachable. No manual certificate command is needed for the normal flow.

Reload Caddy:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Updates

```bash
cd /opt/bliishspace
sudo git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
sudo -u bliish -H bash -lc 'set -a; . /etc/bliishspace.env; set +a; cd /opt/bliishspace; pnpm db:init'
sudo systemctl restart bliishspace
```

The GitHub Actions workflow runs this same update path automatically after checks pass on `main`, if GitHub deploys are configured with [setup-github.sh](hetzner-cloud-cli.md#github-values). For self-hosted GitHub deploys, configure a fork or repository you control; GitHub needs permission to store the instance's deploy secrets there.

Updates replace code in `/opt/bliishspace`; they do not replace `/var/lib/bliishspace/bliish.sqlite`, `/var/lib/bliishspace/uploads`, or `/etc/bliishspace.env`. Back those paths up before maintenance changes; normal deploys preserve users, content, uploads, and admin branding.

## Backups

Back up the SQLite database and uploads directory. Hetzner server backups are useful for cheap whole-disk recovery, but still keep an application archive you can move off the server.

```bash
sudo install -d -o bliish -g bliish /var/lib/bliishspace/backups
sudo -u bliish sqlite3 /var/lib/bliishspace/bliish.sqlite ".backup '/var/lib/bliishspace/backups/bliish.sqlite'"
sudo tar -C /var/lib/bliishspace -czf "/var/lib/bliishspace/backups/bliishspace-$(date +%Y%m%d-%H%M%S).tar.gz" backups/bliish.sqlite uploads
```

Move backup archives off the server regularly.

## Restore

Stop the app:

```bash
sudo systemctl stop bliishspace
```

Restore the database and uploads from a backup archive:

```bash
sudo tar -C /var/lib/bliishspace -xzf /path/to/bliishspace-backup.tar.gz
sudo install -o bliish -g bliish -m 0640 /var/lib/bliishspace/backups/bliish.sqlite /var/lib/bliishspace/bliish.sqlite
sudo rm -f /var/lib/bliishspace/bliish.sqlite-wal /var/lib/bliishspace/bliish.sqlite-shm
sudo chown -R bliish:bliish /var/lib/bliishspace/uploads
```

Start the app:

```bash
sudo systemctl start bliishspace
```

Smoke test:

- open `/`;
- create or log into an account;
- open `/admin` when signed in as the admin account;
- upload a small profile image;
- open an existing profile page;
- check `sudo journalctl -u bliishspace -n 100`.
