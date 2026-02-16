#!/bin/bash
set -e

# ============================================
# Dr. Shumard Protocol Manager - Deploy Script
# ============================================
# Usage: ./deploy.sh
# Always pulls latest code, rebuilds, and deploys.

echo "========================================"
echo "Dr. Shumard Protocol Manager - Deploy"
echo "========================================"
echo ""

# 1. Pull latest changes
echo "[1/4] Pulling latest changes from git..."
git pull origin main || git pull origin master || { echo "Git pull failed. Check your branch."; exit 1; }
echo "  Done."
echo ""

# 2. Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "[INFO] Creating .env file with defaults..."
    cat > .env << 'EOF'
# Dr. Shumard Protocol Manager Config
# Change APP_PORT if 3800 is already in use
APP_PORT=3800
MONGO_PORT=27018
MONGO_URL=mongodb://mongo:27017/drshumard_protocol
JWT_SECRET=change-this-to-a-long-random-secret-key
EOF
    echo "  Created .env - EDIT IT before first deploy!"
    echo "  At minimum, change JWT_SECRET to a random string."
    echo ""
fi

# 3. Build and deploy
echo "[2/4] Building Docker images..."
docker compose build --no-cache
echo "  Done."
echo ""

echo "[3/4] Starting containers..."
docker compose up -d
echo "  Done."
echo ""

# 4. Health check
echo "[4/4] Waiting for services to start..."
sleep 5

APP_PORT=$(grep APP_PORT .env 2>/dev/null | cut -d= -f2 || echo 3800)

if curl -sf http://localhost:${APP_PORT}/api/auth/login > /dev/null 2>&1; then
    echo "  Health check: PASSED"
else
    echo "  Health check: Waiting a bit more..."
    sleep 10
    if curl -sf http://localhost:${APP_PORT} > /dev/null 2>&1; then
        echo "  Health check: PASSED"
    else
        echo "  Health check: FAILED - check logs with: docker compose logs"
    fi
fi

echo ""
echo "========================================"
echo "Deployment complete!"
echo "App running at: http://localhost:${APP_PORT}"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f        # View logs"
echo "  docker compose restart         # Restart"
echo "  docker compose down            # Stop"
echo "  docker compose down -v         # Stop + wipe DB"
echo "========================================"
