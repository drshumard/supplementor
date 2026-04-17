# GitHub Actions Deployment Guide

## Overview

Every push to `main` automatically deploys to your production server via SSH.
You can also trigger a deploy manually from GitHub.

## One-Time Setup

### 1. Generate an SSH key for GitHub Actions

On your **local machine** (not the server):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""
```

This creates two files:
- `~/.ssh/github_deploy_key` — private key (goes to GitHub)
- `~/.ssh/github_deploy_key.pub` — public key (goes to your server)

### 2. Add the public key to your server

SSH into your server and add the public key:

```bash
# On your server
cat >> ~/.ssh/authorized_keys << 'EOF'
<paste contents of github_deploy_key.pub here>
EOF
```

### 3. Add secrets to GitHub

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 3 secrets:

| Secret Name | Value |
|-------------|-------|
| `SERVER_HOST` | Your server's IP address (e.g., `143.198.xxx.xxx`) |
| `SERVER_USER` | SSH username (e.g., `root` or `deploy`) |
| `SERVER_SSH_KEY` | Entire contents of `~/.ssh/github_deploy_key` (the PRIVATE key) |

Optional:
| `SERVER_PORT` | SSH port if not 22 |

### 4. Push the workflow file

The workflow file is already at `.github/workflows/deploy.yml`.
Just commit and push:

```bash
git add .github/
git commit -m "Add GitHub Actions deployment"
git push origin main
```

## How It Works

```
Push to main → GitHub Actions triggers → SSH into server → Run deploy steps
```

The deploy steps are identical to `deploy.sh`:
1. `git pull origin main`
2. Check `.env` files exist
3. Install Python dependencies
4. Inject Clerk key + build frontend
5. Restart PM2 processes
6. Health check

## Manual Deploy

Go to your repo → **Actions** → **Deploy to Production** → **Run workflow** → **Run workflow**

## Monitoring

### View deploy logs
Go to repo → **Actions** → click the latest run → click **deploy** → expand **Deploy via SSH**

### If deploy fails
1. Check the GitHub Actions log for the error
2. SSH into your server and check:
   ```bash
   pm2 status
   pm2 logs drshumard-protocol-backend --lines 50
   pm2 logs drshumard-protocol-frontend --lines 50
   ```
3. You can always run `deploy.sh` manually as a fallback:
   ```bash
   cd /var/www/supplemetor
   ./deploy.sh
   ```

## Prerequisites on Server

These must be set up before the first GitHub Actions deploy:

- [x] Git repo cloned at `/var/www/supplemetor`
- [x] `backend/.env` created with all secrets
- [x] `frontend/.env` created with `REACT_APP_CLERK_PUBLISHABLE_KEY` and `REACT_APP_BACKEND_URL`
- [x] Nginx configured for `fm.drshumard.com`
- [x] SSL certificate via certbot
- [x] PM2 installed globally (`npm install -g pm2`)
- [x] `serve` installed globally (`npm install -g serve`)
- [x] Python 3.11+ and Node.js 18+ installed
- [x] `pm2 startup` run so PM2 survives reboots

## Security Notes

- The SSH private key is stored as a GitHub secret — encrypted at rest, only exposed during workflow runs
- The `.env` files are NOT in the repo — they live only on the server
- The workflow only runs on pushes to `main` — feature branches don't trigger deploys
- Use a dedicated deploy SSH key (not your personal key)
