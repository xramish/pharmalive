# Putting Pharmalive online

The app runs as three Docker containers on one server:

- **db** – PostgreSQL, data stored in a Docker volume
- **app** – the Pharmalive web app
- **caddy** – web server that gets a free HTTPS certificate automatically (phones need HTTPS for the camera)

## 1. What to buy

| Item | Recommended | Notes |
|---|---|---|
| Server (VPS) | Ubuntu 24.04, 2 CPU, 4 GB RAM, 40 GB SSD | From a hosting provider **in Uzbekistan** (personal data law). Ask for "VPS Ubuntu 24.04 with root access and a public IP". |
| Domain | e.g. `pharmalive.uz` | `.uz` domains are sold by registrars listed at cctld.uz. You can use a subdomain like `app.pharmalive.uz`. |

## 2. Point the domain to the server

In your domain's DNS settings add an **A record**:

```
app.pharmalive.uz  →  <server IP address>
```

Wait until `ping app.pharmalive.uz` shows the server's IP (5 minutes – a few hours).

## 3. Install Docker on the server

Connect to the server (`ssh root@<server IP>`) and run:

```bash
curl -fsSL https://get.docker.com | sh
```

## 4. Download the app and configure it

```bash
git clone https://github.com/xramish/pharmalive.git /opt/pharmalive
cd /opt/pharmalive
cp .env.production.example .env
nano .env
```

Fill in `.env`:

```
DOMAIN=app.pharmalive.uz
DB_PASSWORD=<random>          # generate with: openssl rand -hex 24
SESSION_SECRET=<random>       # generate with: openssl rand -hex 32
ADMIN_LOGIN=admin
ADMIN_PASSWORD=<strong password for the first admin>
```

(The repository is private, so `git clone` will ask for your GitHub username and a
[personal access token](https://github.com/settings/tokens) as the password.)

## 5. Start

```bash
docker compose up -d --build
```

First start takes a few minutes. Then open `https://app.pharmalive.uz` and log in as admin.
Create the workers (Admin → Xodimlar), companies and tariffs.

Check that everything is running: `docker compose ps` · see app logs: `docker compose logs -f app`

## 6. Daily backups

```bash
crontab -e
```

add the line:

```
0 2 * * * cd /opt/pharmalive && ./scripts/backup.sh
```

Backups go to `/opt/pharmalive/backups` (last 30 days kept). **Copy them off the server regularly**
(e.g. download weekly) — if the server dies, backups on it die too.

Restore a backup:

```bash
gunzip -c backups/pharmalive-2026-09-25.sql.gz | docker compose exec -T db psql -U pharmalive pharmalive
```

## Updating to a new version

```bash
cd /opt/pharmalive
git pull
docker compose up -d --build
```

Database changes are applied automatically on start.

## Drivers' phones

Send drivers the link `https://app.pharmalive.uz`. After logging in:

- **Android (Chrome):** menu ⋮ → *Add to Home screen*
- **iPhone (Safari):** Share → *Add to Home Screen*

It then opens like a normal app. The first scan asks for camera permission — press *Allow*.

## Firewall

Only ports **22** (SSH), **80** and **443** need to be open. The database is not exposed to the internet.
