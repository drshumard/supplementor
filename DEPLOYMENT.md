# Dr. Shumard Protocol Manager — Deployment Guide

## Prerequisites

- **Docker** (v20+) and **Docker Compose** (v2+)
- **Git**
- A server with at least 1GB RAM

## Quick Start

```bash
# 1. Clone the repo
git clone <your-repo-url> drshumard-protocol
cd drshumard-protocol

# 2. Make deploy script executable
chmod +x deploy.sh

# 3. Run deploy
./deploy.sh
```

On first run, it creates a `.env` file. **Edit it before deploying:**

```bash
nano .env
```

```env
# Change the port if 3800 is taken
APP_PORT=3800

# MongoDB port (internal, change if 27018 is taken)
MONGO_PORT=27018

# MongoDB connection (leave as-is for Docker)
MONGO_URL=mongodb://mongo:27017/drshumard_protocol

# IMPORTANT: Change this to a random string
JWT_SECRET=your-random-secret-here-at-least-32-chars
```

Then run `./deploy.sh` again.

## Architecture

```
┌─────────────────────────────────┐
│         Your Server             │
│                                 │
│  ┌───────────────────────────┐  │
│  │   Docker: drshumard-app   │  │
│  │                           │  │
│  │   Nginx (:80 internal)    │  │
│  │   ├── /api/* → FastAPI    │  │
│  │   └── /*    → React build │  │
│  │                           │  │
│  │   FastAPI (:8001 internal)│  │
│  └───────────┬───────────────┘  │
│              │                  │
│  ┌───────────▼───────────────┐  │
│  │  Docker: drshumard-mongo  │  │
│  │  MongoDB (:27017 internal)│  │
│  │  Data: docker volume      │  │
│  └───────────────────────────┘  │
│                                 │
│  Exposed: localhost:3800        │
└─────────────────────────────────┘
```

## Updating

Just run the deploy script again. It always pulls latest code:

```bash
./deploy.sh
```

## Reverse Proxy (Nginx/Caddy)

If you already have Nginx on the host serving other apps:

### Nginx

```nginx
server {
    listen 80;
    server_name protocol.drshumard.com;

    location / {
        proxy_pass http://127.0.0.1:3800;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy

```
protocol.drshumard.com {
    reverse_proxy localhost:3800
}
```

## Default Accounts

On first launch, the app seeds:

| Email | Password | Role |
|-------|----------|------|
| admin@clarity.com | admin123 | Admin |
| hc@clarity.com | hc123 | Health Coach |

**Change these passwords immediately** via the Users page after first login.

## Data & Backups

MongoDB data is stored in a Docker volume (`mongo_data`). To backup:

```bash
# Backup
docker exec drshumard-mongo mongodump --out /tmp/backup
docker cp drshumard-mongo:/tmp/backup ./backup-$(date +%Y%m%d)

# Restore
docker cp ./backup-YYYYMMDD drshumard-mongo:/tmp/restore
docker exec drshumard-mongo mongorestore /tmp/restore
```

## Troubleshooting

```bash
# View logs
docker compose logs -f

# View just backend logs
docker compose logs -f app

# Restart everything
docker compose restart

# Full rebuild (if something is stuck)
docker compose down
docker compose build --no-cache
docker compose up -d

# Check if port is in use
lsof -i :3800
```

## Stopping

```bash
# Stop (keeps data)
docker compose down

# Stop and DELETE all data
docker compose down -v
```
