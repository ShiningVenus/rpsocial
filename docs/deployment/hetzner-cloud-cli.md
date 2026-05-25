# Hetzner Cloud CLI Deployment

This is the recommended production path for the official Bliish.space instance and for people running an independent Bliish instance. It creates one small Hetzner Cloud VPS, installs the app with cloud-init, then optionally configures GitHub Actions so future pushes to `main` deploy over SSH.

We recommend Hetzner Cloud for this project because the small cost-optimized VPS plans fit the app's shape: one Node process, SQLite, local uploads, Caddy, and systemd. The default target is Nuremberg, Germany, which keeps primary app data on infrastructure in Europe under the instance operator's control. That does not replace legal/privacy work, but it is a practical default for a privacy-conscious self-hosted social site.

The default `cx23` target is deliberately small. It was listed by Hetzner at $4.99/month before VAT as of May 2026, before optional IPv4 and backups. With controlled uploads and normal social activity, treat it as a practical starting point for roughly 10k-50k registered accounts and 1k-5k daily active users; resize when disk, memory, CPU, or response times say the instance has outgrown it.

## Which Path

There are two audiences, but the server process is the same:

| Operator | What You Deploy | GitHub Repo To Configure |
| --- | --- | --- |
| Bliish maintainers | `https://bliish.space` from `bliish-com/bliishspace` | `bliish-com/bliishspace` |
| Self-hosters | your own domain from your own fork or copy | your GitHub repo, for example `yourname/bliishspace` |

The only difference is what you put in `deploy/hetzner/production.env`.

If you want automatic deploys from GitHub, use a repository you control. For the Bliish maintainers, that is the upstream repo. For everyone else, that usually means a public fork. GitHub Actions secrets and variables are written to `BLIISH_GITHUB_REPOSITORY`, and GitHub only lets you write environment secrets for repositories where you have enough access.

If you do not want GitHub auto-deploys, you can clone the upstream repository locally, provision the server, skip `setup-github.sh`, and run `deploy/hetzner/update.sh` manually when you want to update.

Keep `BLIISH_REPOSITORY_URL` public unless you intentionally extend the deployment with Git credentials. The default VPS bootstrap does a plain `git clone` over HTTPS.

## Deployment Model

This is the whole loop:

1. Your local machine creates the VPS with the Hetzner CLI.
2. cloud-init clones `BLIISH_REPOSITORY_URL` onto the VPS and starts the app with systemd.
3. systemd restarts the app if it crashes.
4. Optional: `setup-github.sh` writes SSH deploy values into `BLIISH_GITHUB_REPOSITORY`.
5. Optional: future pushes to that repository's `main` branch run checks, SSH into the VPS, update the configured ref, rebuild, run `pnpm db:init`, and restart.

The VPS does not need a GitHub token. GitHub does not need a Hetzner token after provisioning. That keeps the open-source setup simple: Hetzner is used once to create the server, then updates happen over SSH.

## One-Time Setup

Install the CLIs:

```bash
brew install hcloud gh
gh auth login
hcloud context create bliishspace
```

Create the production config:

```bash
cp deploy/hetzner/production.env.example deploy/hetzner/production.env
$EDITOR deploy/hetzner/production.env
```

For the official Bliish instance, the branded defaults are already close:

```bash
BLIISH_DOMAIN=bliish.space
BLIISH_BASE_URL=https://bliish.space
BLIISH_REPOSITORY_URL=https://github.com/bliish-com/bliishspace.git
BLIISH_GITHUB_REPOSITORY=bliish-com/bliishspace
```

For a self-hosted instance with GitHub auto-deploys, fork or copy the repo first, keep that fork public unless you add private Git auth, then change at least these values:

```bash
BLIISH_DOMAIN=social.your-domain.tld
BLIISH_BASE_URL=https://social.your-domain.tld
BLIISH_REPOSITORY_URL=https://github.com/YOUR_GITHUB_NAME/bliishspace.git
BLIISH_GITHUB_REPOSITORY=YOUR_GITHUB_NAME/bliishspace
```

`BLIISH_REPOSITORY_URL` is what the VPS pulls from. `BLIISH_GITHUB_REPOSITORY` is where `setup-github.sh` writes deploy secrets and variables. They are usually the same repository, but they are separate so advanced operators can deploy from one repo while configuring another.

Provision the server:

```bash
deploy/hetzner/provision.sh
```

After the script prints the server IP, point DNS at it. For the default IPv4-enabled deployment, create an A record for your domain. If you also use IPv6, add the AAAA record from:

```bash
hcloud server ip --ipv6 bliishspace-1
```

Wait for first boot:

```bash
ssh -i ~/.ssh/bliishspace-deploy root@SERVER_IP 'cloud-init status --wait'
ssh -i ~/.ssh/bliishspace-deploy root@SERVER_IP 'systemctl status bliishspace --no-pager'
```

HTTPS is handled by Caddy in this flow. Once DNS points at the server and ports 80/443 are reachable, Caddy provisions and renews the TLS certificate automatically; keep `BLIISH_BASE_URL` set to `https://...`.

Configure GitHub production deploys:

```bash
deploy/hetzner/setup-github.sh
```

After that, normal deploys are:

```bash
git push origin main
```

GitHub runs typecheck, tests, and build first. If they pass, GitHub SSHes to the VPS and runs [update.sh](../../deploy/hetzner/update.sh).

## If You Are Self-Hosting

Use this model:

1. Fork `bliish-com/bliishspace` on GitHub, or create your own public repository from the source.
2. Clone your fork locally.
3. Edit `deploy/hetzner/production.env`.
4. Run `deploy/hetzner/provision.sh`.
5. Point DNS to the server.
6. Run `deploy/hetzner/setup-github.sh`.
7. Push future changes to your fork's `main` branch.

When upstream Bliish releases changes you want, merge or rebase upstream into your fork, then push your fork's `main` branch. That push is what deploys your instance.

If you only want to run the unmodified upstream app and do not care about GitHub auto-deploys, you can skip the fork. Clone `bliish-com/bliishspace` locally, keep `BLIISH_REPOSITORY_URL=https://github.com/bliish-com/bliishspace.git`, skip `setup-github.sh`, and run `deploy/hetzner/update.sh` manually after upstream updates.

You do not have to modify the app name or branding to test deployment, but a public instance should publish its own privacy, moderation, contact, and backup policies.

## Production Config

The local file `deploy/hetzner/production.env` is ignored by git and read by all Hetzner helper scripts.

Important defaults:

| Variable | Default | Who Usually Changes It |
| --- | --- | --- |
| `BLIISH_DOMAIN` | `bliish.space` | self-hosters |
| `BLIISH_BASE_URL` | `https://bliish.space` | self-hosters |
| `BLIISH_SERVER_NAME` | `bliishspace-1` | optional |
| `BLIISH_HCLOUD_LOCATION` | `nbg1` | optional |
| `BLIISH_HCLOUD_SERVER_TYPE` | `cx23` | optional |
| `BLIISH_HCLOUD_IMAGE` | `ubuntu-24.04` | rarely |
| `BLIISH_HCLOUD_ENABLE_IPV4` | `true` | optional |
| `BLIISH_HCLOUD_ENABLE_BACKUPS` | `false` | recommended for production |
| `BLIISH_HCLOUD_ENABLE_DELETE_PROTECTION` | `true` | rarely |
| `BLIISH_DEPLOY_SSH_KEY` | `$HOME/.ssh/bliishspace-deploy` | optional |
| `BLIISH_REPOSITORY_URL` | `https://github.com/bliish-com/bliishspace.git` | self-hosters |
| `BLIISH_REPOSITORY_REF` | `main` | optional |
| `BLIISH_ADMIN_USER_ID` | `1` | rarely |
| `BLIISH_MEDIA_CONCURRENCY` | `1` | optional |
| `BLIISH_GITHUB_REPOSITORY` | `bliish-com/bliishspace` | self-hosters |
| `BLIISH_GITHUB_ENVIRONMENT` | `production` | optional |

`nbg1` is Nuremberg, Germany. `cx23` is the smallest current cost-optimized x86 VPS shape we target. `BLIISH_HCLOUD_ENABLE_IPV4=true` costs a little more than IPv6-only but avoids breaking visitors and deploy machines that do not have reliable IPv6. Upload volume is the main variable for this app, so keep file limits conservative and watch `/var/lib/bliishspace` before treating the estimate above as capacity planning.

For absolute cheapest networking, set:

```bash
BLIISH_HCLOUD_ENABLE_IPV4=false
```

Only do that if you are comfortable operating an IPv6-only public site.

## GitHub Values

`setup-github.sh` creates or updates the GitHub environment named by `BLIISH_GITHUB_ENVIRONMENT` and writes the needed deploy values with the GitHub CLI:

- secret `BLIISH_DEPLOY_SSH_PRIVATE_KEY`
- secret `BLIISH_DEPLOY_KNOWN_HOSTS`
- variable `BLIISH_BASE_URL`
- variable `BLIISH_SSH_HOST`
- variable `BLIISH_SSH_USER`
- variable `BLIISH_REPOSITORY_REF`

No Hetzner API token is stored in GitHub. GitHub only needs SSH access to the already-provisioned server.

## What Gets Installed

The VPS stores app state on local disk:

- SQLite: `/var/lib/bliishspace/bliish.sqlite`
- Uploads: `/var/lib/bliishspace/uploads`
- Environment: `/etc/bliishspace.env`
- Code: `/opt/bliishspace`

cloud-init installs Node.js, pnpm, SQLite, Caddy, the systemd service, and the app. systemd restarts the app if it crashes.

The account whose id matches `BLIISH_ADMIN_USER_ID` receives the `admin` role. With the default value, create the first account before opening signups widely. All users are kept as accepted friends with that protected admin account and cannot unfriend or block it.

When group id `1` exists, it is the default group: existing and new users are added automatically, users cannot leave it, and the group cannot be deleted.

After signing in as the admin account, open `/admin` to manage branding, home page copy, contact details, announcements, moderation, automod, rate limits, users, email outbox, audit logs, and database table counts without editing source files.

Admin branding and instance settings are stored in SQLite. Updating the code does not reset them. The defaults in the repository are only used when the database has no saved value or when an admin intentionally resets a setting.

## Manual Updates

GitHub deploys use the same script you can run locally:

```bash
deploy/hetzner/update.sh
```

The script loads `deploy/hetzner/production.env`, SSHes to the VPS, updates code in `/opt/bliishspace`, installs dependencies, builds, runs `pnpm db:init`, and restarts `bliishspace`.

It does not replace `/var/lib/bliishspace/bliish.sqlite`, `/var/lib/bliishspace/uploads`, or `/etc/bliishspace.env`. Those hold the instance's users, posts, uploads, admin branding, and production environment. Back them up before maintenance changes; normal deploys preserve them.

## Backups

This deployment keeps the app simple, so backups matter. Back up both:

- `/var/lib/bliishspace/bliish.sqlite`
- `/var/lib/bliishspace/uploads`

Hetzner server backups are the easiest extra safety net and cost 20% of the server price when enabled:

```bash
BLIISH_HCLOUD_ENABLE_BACKUPS=true
```

Still keep an application archive you can move off the server. The manual [backup commands](hetzner-cloud.md#backups) apply to this CLI flow too.

## Troubleshooting

Cloud-init output:

```bash
ssh -i ~/.ssh/bliishspace-deploy root@SERVER_IP 'tail -n 200 /var/log/cloud-init-output.log'
```

App logs:

```bash
ssh -i ~/.ssh/bliishspace-deploy root@SERVER_IP 'journalctl -u bliishspace -f'
```

Caddy logs:

```bash
ssh -i ~/.ssh/bliishspace-deploy root@SERVER_IP 'journalctl -u caddy -n 100 --no-pager'
```
