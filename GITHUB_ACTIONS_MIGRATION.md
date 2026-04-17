# Migrating to GitHub Actions Deployment

Your server is already set up and running with `deploy.sh`. This guide migrates you to GitHub Actions so builds happen on GitHub, not your VPS.

---

## Step 1: Generate SSH deploy key

On your **local machine**:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""
```

## Step 2: Add public key to your server

```bash
cat ~/.ssh/github_deploy_key.pub | ssh root@YOUR_SERVER_IP "cat >> ~/.ssh/authorized_keys"
```

Or manually: SSH into your server, open `~/.ssh/authorized_keys`, paste the contents of `~/.ssh/github_deploy_key.pub` at the end.

## Step 3: Add 4 secrets to GitHub

Go to `github.com/drshumard/supplemetor` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | Your server IP |
| `SERVER_USER` | `root` (or whatever you SSH as) |
| `SERVER_SSH_KEY` | Full contents of `~/.ssh/github_deploy_key` (the **private** key file — include the BEGIN/END lines) |
| `CLERK_PUBLISHABLE_KEY` | Your production key: `pk_live_...` (from Clerk Dashboard → API Keys) |

## Step 4: Push the workflow file

The `.github/workflows/deploy.yml` file should already be in your code. Push it:

```bash
git add .github/
git commit -m "Add GitHub Actions deployment"
git push origin main
```

## Step 5: Deploy

1. Go to `github.com/drshumard/supplemetor`
2. Click **Actions** tab
3. Click **Deploy to Production** on the left
4. Click **Run workflow** → **Run workflow**
5. Watch it run (~2-3 min)

## What changed

**Before (deploy.sh):**
```
Your VPS does everything:
git pull → yarn install → yarn build → pip install → restart PM2
```

**After (GitHub Actions):**
```
GitHub builds it:        Your VPS just receives it:
yarn install             extract tar.gz
yarn build          →    pip install (venv, fast)
package tar.gz           restart PM2
SCP to server            health check
```

Your VPS no longer runs Node builds. `deploy.sh` still works as a manual fallback.

## That's it

From now on: push to `main` → go to Actions → Run workflow. Done.
