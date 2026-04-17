# Dr. Shumard Protocol Manager — Complete Setup & Deployment Guide

## Table of Contents
1. [Server Prerequisites](#1-server-prerequisites)
2. [Initial Server Setup](#2-initial-server-setup)
3. [GitHub Actions Setup](#3-github-actions-setup)
4. [First Deploy](#4-first-deploy)
5. [Ongoing Deployments](#5-ongoing-deployments)
6. [CLI Tools](#6-cli-tools)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Server Prerequisites

Your Ubuntu VPS needs these installed:

```bash
# Check what you have
node -v        # Need 18+
python3 --version  # Need 3.11+
mongosh --version  # MongoDB
nginx -v       # Nginx
pm2 --version  # PM2
yarn --version # Yarn
serve --version # Serve
```

If anything is missing:
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Yarn
npm install -g yarn

# PM2 + Serve
npm install -g pm2 serve

# Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip
```

---

## 2. Initial Server Setup

### 2.1 Clone the repo

```bash
cd /var/www
git clone https://github.com/drshumard/supplemetor.git supplemetor
cd supplemetor
```

### 2.2 Create backend .env

```bash
cat > /var/www/supplemetor/backend/.env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=drshumard_protocol
CLERK_SECRET_KEY=sk_live_YOUR_CLERK_SECRET_KEY
CLERK_PUBLISHABLE_KEY=pk_live_YOUR_CLERK_PUBLISHABLE_KEY
DROPBOX_APP_KEY=fehhcslllg7sed2
DROPBOX_APP_SECRET=jccwpl6hc9y65r5
DROPBOX_REFRESH_TOKEN=8UMBXE567wcAAAAAAAAAAZgVjxnR4XYOv0qpWyOIvg5vkbCkn7st60Up0CdzWPIR
DROPBOX_UPLOAD_FOLDER=/FM Protocol
EOF
```

### 2.3 Create frontend .env

```bash
cat > /var/www/supplemetor/frontend/.env << 'EOF'
REACT_APP_BACKEND_URL=https://fm.drshumard.com
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_CLERK_PUBLISHABLE_KEY
EOF
```

### 2.4 Set up Python venv

```bash
cd /var/www/supplemetor/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

### 2.5 Set up Nginx

```bash
sudo tee /etc/nginx/sites-available/fm.drshumard.com > /dev/null << 'NGINX'
server {
    listen 80;
    server_name fm.drshumard.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8047;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 10M;
    }

    location / {
        proxy_pass http://127.0.0.1:3847;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/fm.drshumard.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 2.6 SSL certificate

```bash
sudo certbot --nginx -d fm.drshumard.com
```

### 2.7 First manual deploy (builds locally this one time)

```bash
cd /var/www/supplemetor
chmod +x deploy.sh
./deploy.sh
```

### 2.8 Make PM2 survive reboots

```bash
pm2 startup
pm2 save
```

### 2.9 Import data (if needed)

```bash
cd /var/www/supplemetor
source backend/venv/bin/activate
python3 import_data.py mongodb://localhost:27017/drshumard_protocol
```

### 2.10 Set first admin

```bash
cd /var/www/supplemetor/backend
source venv/bin/activate
python3 manage_users.py set-admin drjason@drshumard.com
```

---

## 3. GitHub Actions Setup

After the server is set up, configure GitHub Actions so future deploys build on GitHub (not your VPS).

### 3.1 Generate SSH deploy key

On your **local machine** (not the server):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""
```

### 3.2 Add public key to server

```bash
# Copy the public key
cat ~/.ssh/github_deploy_key.pub

# SSH into your server and add it
ssh root@YOUR_SERVER_IP
echo "PASTE_THE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
exit
```

### 3.3 Add secrets to GitHub

Go to: `github.com/drshumard/supplemetor` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 4 secrets:

| Secret Name | Where to get it |
|-------------|----------------|
| `SERVER_HOST` | Your server's IP address |
| `SERVER_USER` | `root` (or your deploy user) |
| `SERVER_SSH_KEY` | Contents of `~/.ssh/github_deploy_key` (the **private** key — open in text editor, copy everything including the BEGIN/END lines) |
| `CLERK_PUBLISHABLE_KEY` | Your **production** Clerk publishable key (`pk_live_...`) from [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |

### 3.4 Verify the workflow file exists

The file `.github/workflows/deploy.yml` should already be in your repo. If not:

```bash
mkdir -p .github/workflows
# Copy deploy.yml into .github/workflows/
git add .github/
git commit -m "Add GitHub Actions deployment"
git push origin main
```

---

## 4. First Deploy via GitHub Actions

1. Go to `github.com/drshumard/supplemetor`
2. Click **Actions** tab
3. Click **Deploy to Production** in the left sidebar
4. Click **Run workflow** (dropdown) → **Run workflow** (button)
5. Watch the deploy — click the running job to see live logs

### What happens:

```
GitHub (2-3 minutes)                    Your VPS (30 seconds)
────────────────────                    ─────────────────────
✓ Checkout code                         
✓ Install Node deps (cached)           
✓ Build React frontend                 
✓ Inject Clerk production key          
✓ Verify Python deps                   
✓ Package tar.gz ──── SCP ──────────►  ✓ Extract files
                                        ✓ pip install (venv)
                                        ✓ Restart PM2
                                        ✓ Health check
```

---

## 5. Ongoing Deployments

### Day-to-day workflow:

```bash
# Make changes locally or in Emergent
git add .
git commit -m "your changes"
git push origin main

# Then deploy:
# GitHub → Actions → Deploy to Production → Run workflow
```

That's it. Push code, click deploy.

---

## 6. CLI Tools

### User management
```bash
cd /var/www/supplemetor/backend
source venv/bin/activate

python3 manage_users.py list                           # Show all users
python3 manage_users.py set-admin user@email.com       # Make admin
python3 manage_users.py set-hc user@email.com          # Make health coach
python3 manage_users.py delete user@email.com          # Remove user
```

### Data import
```bash
python3 import_data.py mongodb://localhost:27017/drshumard_protocol
```

### MongoDB backup
```bash
mongodump --db drshumard_protocol --out /backup/$(date +%Y%m%d)
```

### MongoDB restore
```bash
mongorestore --db drshumard_protocol /backup/YYYYMMDD/drshumard_protocol/
```

---

## 7. Troubleshooting

### Check if services are running
```bash
pm2 status
```

### View logs
```bash
pm2 logs drshumard-protocol-backend --lines 50
pm2 logs drshumard-protocol-frontend --lines 50
```

### Restart services
```bash
pm2 restart drshumard-protocol-backend
pm2 restart drshumard-protocol-frontend
```

### Full restart
```bash
pm2 delete all
cd /var/www/supplemetor
./deploy.sh
```

### Check ports
```bash
lsof -i :8047  # Backend
lsof -i :3847  # Frontend
```

### Nginx issues
```bash
sudo nginx -t                    # Test config
sudo systemctl reload nginx      # Reload
sudo tail -f /var/log/nginx/error.log  # Logs
```

### GitHub Actions failed
1. Go to Actions tab → click failed run → read the error
2. Most common issues:
   - SSH key wrong → re-check `SERVER_SSH_KEY` secret
   - Server IP changed → update `SERVER_HOST` secret
   - `.env` missing on server → create manually (section 2.2, 2.3)
   - `yarn build` failed → check for code errors in the build log

### Manual fallback deploy
If GitHub Actions isn't working, you can always deploy directly:
```bash
cd /var/www/supplemetor
git pull origin main
./deploy.sh
```

---

## Architecture

```
Internet
  │
  ▼
Nginx (443/SSL) — fm.drshumard.com
  ├── /api/*  → FastAPI (127.0.0.1:8047) via PM2
  └── /*      → React build (127.0.0.1:3847) via PM2
                    │
                    ▼
              MongoDB (localhost:27017)
              Database: drshumard_protocol
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/.env` | All backend secrets (Clerk, Dropbox, MongoDB) |
| `frontend/.env` | Clerk publishable key + backend URL |
| `backend/server.py` | Main API |
| `backend/calculations.py` | Cost calculation engine |
| `backend/pdf_generator.py` | PDF generation |
| `backend/dropbox_integration.py` | Dropbox uploads |
| `backend/manage_users.py` | CLI user management |
| `deploy.sh` | Manual deploy script (fallback) |
| `.github/workflows/deploy.yml` | GitHub Actions workflow |
