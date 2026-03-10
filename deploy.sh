#!/bin/bash
set -e

# ============================================
# Dr. Shumard Protocol Manager - Deploy Script
# Domain: fm.drshumard.com
# Stack: React (pm2) + FastAPI (pm2) + Nginx + MongoDB
# ============================================

APP_NAME="drshumard-protocol"
APP_DIR="/var/www/drshumard-protocol"
FRONTEND_PORT=3847
BACKEND_PORT=8047
DOMAIN="fm.drshumard.com"
MONGO_DB="drshumard_protocol"

echo "========================================"
echo "Dr. Shumard Protocol Manager - Deploy"
echo "========================================"
echo ""

# ── 1. Pull latest code ──
echo "[1/7] Pulling latest changes..."
cd $APP_DIR
git pull origin main || git pull origin master || { echo "ERROR: git pull failed"; exit 1; }
echo "  Done."
echo ""

# ── 2. Backend setup ──
echo "[2/7] Setting up backend..."
cd $APP_DIR/backend

# Create venv if doesn't exist
if [ ! -d "venv" ]; then
    echo "  Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt
deactivate
echo "  Done."
echo ""

# ── 3. Backend .env ──
if [ ! -f "$APP_DIR/backend/.env" ]; then
    echo "[3/7] Creating backend .env..."
    JWT_SECRET=$(openssl rand -hex 32)
    cat > $APP_DIR/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017/$MONGO_DB
JWT_SECRET=$JWT_SECRET
GOOGLE_DRIVE_ID=0AGikKY7QHD7NUk9PVA
GOOGLE_DRIVE_IMPERSONATE_USER=drjason@drshumard.com
EOF
    echo "  Created .env with random JWT secret."
else
    echo "[3/7] Backend .env exists, skipping."
fi
echo ""

# ── 4. Frontend build ──
echo "[4/7] Building frontend..."
cd $APP_DIR/frontend

# Install deps if needed
if [ ! -d "node_modules" ]; then
    yarn install
fi

# Build with backend URL pointing to same domain
REACT_APP_BACKEND_URL=https://$DOMAIN yarn build
echo "  Done."
echo ""

# ── 5. PM2 ecosystem ──
echo "[5/7] Configuring PM2..."
cat > $APP_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: '${APP_NAME}-backend',
      cwd: '${APP_DIR}/backend',
      script: 'venv/bin/uvicorn',
      args: 'server:app --host 127.0.0.1 --port ${BACKEND_PORT} --workers 2',
      interpreter: 'none',
      env_file: '${APP_DIR}/backend/.env',
      env: {
        MONGO_URL: 'mongodb://localhost:27017/${MONGO_DB}',
      },
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: '${APP_NAME}-frontend',
      cwd: '${APP_DIR}/frontend',
      script: 'npx',
      args: 'serve -s build -l ${FRONTEND_PORT}',
      interpreter: 'none',
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
EOF
echo "  Done."
echo ""

# ── 6. PM2 start/restart ──
echo "[6/7] Starting PM2 processes..."
cd $APP_DIR

# Install serve globally if not present
which serve > /dev/null 2>&1 || npm install -g serve

# Stop existing if running
pm2 delete ${APP_NAME}-backend 2>/dev/null || true
pm2 delete ${APP_NAME}-frontend 2>/dev/null || true

# Start
pm2 start ecosystem.config.js
pm2 save
echo "  Done."
echo ""

# ── 7. Nginx config ──
echo "[7/7] Configuring Nginx..."
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

cat > $NGINX_CONF << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # API requests -> FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        client_max_body_size 10M;
    }

    # Everything else -> React frontend
    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/$DOMAIN

# Test and reload
nginx -t && systemctl reload nginx
echo "  Done."
echo ""

# ── SSL ──
echo "========================================"
echo "Deployment complete!"
echo ""
echo "App: http://$DOMAIN"
echo "Backend: http://127.0.0.1:$BACKEND_PORT"
echo "Frontend: http://127.0.0.1:$FRONTEND_PORT"
echo ""
echo "To add SSL, run:"
echo "  sudo certbot --nginx -d $DOMAIN"
echo ""
echo "Useful commands:"
echo "  pm2 status                    # Check processes"
echo "  pm2 logs ${APP_NAME}-backend  # Backend logs"
echo "  pm2 logs ${APP_NAME}-frontend # Frontend logs"
echo "  pm2 restart all               # Restart everything"
echo "  ./deploy.sh                   # Redeploy (git pull + rebuild)"
echo "========================================"
