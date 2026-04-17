# GitHub Actions Deployment Guide

## Overview

Manual deploy from GitHub Actions tab. **Builds happen on GitHub's servers** — your VPS only receives the pre-built artifacts, installs Python deps, and restarts PM2.

## What happens during deploy

```
GitHub Actions (build server)          Your VPS (production)
─────────────────────────────          ────────────────────
1. Checkout code                       
2. yarn install + yarn build           
3. pip install (verify)                
4. Package into tar.gz ──────────────► 5. Extract files
                                       6. pip install in venv
                                       7. Restart PM2
                                       8. Health check
```

Your VPS never runs `yarn install` or `yarn build` — that's the heaviest part.

## One-Time Setup

### 1. Generate an SSH deploy key

On your **local machine**:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""
```

### 2. Add public key to your server

```bash
# On your server
cat >> ~/.ssh/authorized_keys << 'EOF'
<paste contents of ~/.ssh/github_deploy_key.pub>
EOF
```

### 3. Add secrets to GitHub

Go to repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Value |
|-------------|-------|
| `SERVER_HOST` | Server IP (e.g., `143.198.xxx.xxx`) |
| `SERVER_USER` | SSH username (e.g., `root`) |
| `SERVER_SSH_KEY` | Contents of `~/.ssh/github_deploy_key` (private key) |
| `CLERK_PUBLISHABLE_KEY` | Your Clerk production publishable key (`pk_live_...`) |

Optional:
| `SERVER_PORT` | SSH port if not 22 |

### 4. Push and deploy

```bash
git add .github/
git commit -m "Add GitHub Actions CI/CD"
git push origin main
```

Then go to repo → **Actions** → **Deploy to Production** → **Run workflow**

## Manual Deploy

Repo → **Actions** tab → **Deploy to Production** → **Run workflow** → **Run workflow**

## Monitoring

- **Deploy logs:** Actions tab → click latest run → expand steps
- **Server logs:** `pm2 logs drshumard-protocol-backend`
- **Fallback:** You can still run `./deploy.sh` on the server manually

## Prerequisites on Server

- [x] Repo cloned at `/var/www/supplemetor`
- [x] `backend/.env` with all secrets
- [x] `frontend/.env` with Clerk key + backend URL
- [x] Nginx + SSL configured
- [x] PM2 + `serve` installed globally
- [x] Python 3.11+ installed
- [x] `pm2 startup` run
