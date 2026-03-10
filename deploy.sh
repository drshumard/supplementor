#!/bin/bash
set -e

# ============================================
# Dr. Shumard Protocol Manager - Deploy Script
# Domain: fm.drshumard.com
# ============================================

APP_NAME="drshumard-protocol"
APP_DIR="/var/www/supplementor"
FRONTEND_PORT=3847
BACKEND_PORT=8047
DOMAIN="fm.drshumard.com"
MONGO_DB="drshumard_protocol"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "========================================="
echo " Dr. Shumard Protocol Manager - Deploy"
echo " Domain: $DOMAIN"
echo " Backend: 127.0.0.1:$BACKEND_PORT"
echo " Frontend: 127.0.0.1:$FRONTEND_PORT"
echo "========================================="
echo ""

# ── 1. Git pull ──
echo -e "${GREEN}[1/7] Pulling latest code...${NC}"
cd $APP_DIR
git pull origin main || git pull origin master || { echo -e "${RED}ERROR: git pull failed${NC}"; exit 1; }
echo ""

# ── 2. Check .env files ──
echo -e "${GREEN}[2/7] Checking environment files...${NC}"

if [ ! -f "$APP_DIR/backend/.env" ]; then
    echo -e "${RED}ERROR: backend/.env not found!${NC}"
    echo ""
    echo "Create it manually:"
    echo ""
    echo "  cat > $APP_DIR/backend/.env << 'EOF'"
    echo "  MONGO_URL=mongodb://localhost:27017/$MONGO_DB"
    echo "  JWT_SECRET=$(openssl rand -hex 32)"
    echo "  GOOGLE_DRIVE_ID=0AGikKY7QHD7NUk9PVA"
    echo "  GOOGLE_DRIVE_IMPERSONATE_USER=drjason@drshumard.com"
    echo "  EOF"
    echo ""
    exit 1
fi
echo "  ✓ backend/.env"

if [ ! -f "$APP_DIR/frontend/.env" ]; then
    echo -e "${RED}ERROR: frontend/.env not found!${NC}"
    echo ""
    echo "Create it manually:"
    echo ""
    echo "  echo 'REACT_APP_BACKEND_URL=https://$DOMAIN' > $APP_DIR/frontend/.env"
    echo ""
    exit 1
fi
echo "  ✓ frontend/.env"
echo ""

# ── 3. Backend dependencies ──
echo -e "${GREEN}[3/7] Installing backend dependencies...${NC}"
cd $APP_DIR/backend

if [ ! -d "venv" ]; then
    echo "  Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
deactivate
echo "  ✓ Python dependencies installed"
echo ""

# ── 4. Frontend build ──
echo -e "${GREEN}[4/7] Building frontend...${NC}"
cd $APP_DIR/frontend

echo "  Installing Node dependencies..."
yarn install --silent
echo "  Building React app..."
yarn build --silent 2>/dev/null || yarn build
echo "  ✓ Frontend built"
echo ""

# ── 5. PM2 processes ──
echo -e "${GREEN}[5/7] Configuring PM2...${NC}"

# Read backend .env and build env string for PM2
ENV_ARGS=""
while IFS='=' read -r key value; do
    if [ -n "$key" ] && [[ ! "$key" =~ ^# ]]; then
        ENV_ARGS="$ENV_ARGS $key=$value"
    fi
done < "$APP_DIR/backend/.env"

# Install serve if needed
which serve > /dev/null 2>&1 || npm install -g serve

# Stop existing
pm2 delete ${APP_NAME}-backend 2>/dev/null || true
pm2 delete ${APP_NAME}-frontend 2>/dev/null || true

# Start backend with env vars from .env
cd $APP_DIR/backend
pm2 start venv/bin/uvicorn \
    --name "${APP_NAME}-backend" \
    --interpreter none \
    -- server:app --host 127.0.0.1 --port $BACKEND_PORT --workers 2

# Apply env vars
while IFS='=' read -r key value; do
    if [ -n "$key" ] && [[ ! "$key" =~ ^# ]]; then
        pm2 env ${APP_NAME}-backend --update "$key=$value" 2>/dev/null || true
    fi
done < "$APP_DIR/backend/.env"

# Start frontend
cd $APP_DIR/frontend
pm2 start npx \
    --name "${APP_NAME}-frontend" \
    --interpreter none \
    -- serve -s build -l $FRONTEND_PORT

pm2 save
echo "  ✓ PM2 processes started"
echo ""

# ── 6. Nginx ──
echo -e "${GREEN}[6/7] Configuring Nginx...${NC}"

if [ ! -f "$NGINX_CONF" ]; then
    sudo tee $NGINX_CONF > /dev/null << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    # API -> FastAPI backend
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
NGINXEOF
    sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/$DOMAIN
    echo "  ✓ Nginx config created: $NGINX_CONF"
    echo -e "  ${YELLOW}NOTE: Run 'sudo certbot --nginx -d $DOMAIN' for SSL${NC}"
else
    echo "  ✓ Nginx config exists (not overwriting)"
fi

sudo nginx -t 2>/dev/null && sudo systemctl reload nginx
echo "  ✓ Nginx reloaded"
echo ""

# ── 7. Health check ──
echo -e "${GREEN}[7/7] Health check...${NC}"
sleep 3

# Check backend
if curl -sf http://127.0.0.1:${BACKEND_PORT}/api/health > /dev/null 2>&1; then
    echo "  ✓ Backend responding on port $BACKEND_PORT"
else
    echo -e "  ${YELLOW}⚠ Backend not responding yet (may need a few seconds)${NC}"
    echo "    Check logs: pm2 logs ${APP_NAME}-backend"
fi

# Check frontend
if curl -sf http://127.0.0.1:${FRONTEND_PORT} > /dev/null 2>&1; then
    echo "  ✓ Frontend responding on port $FRONTEND_PORT"
else
    echo -e "  ${YELLOW}⚠ Frontend not responding yet (may need a few seconds)${NC}"
    echo "    Check logs: pm2 logs ${APP_NAME}-frontend"
fi

# Check MongoDB
if mongosh --eval "db.runCommand({ping:1})" --quiet > /dev/null 2>&1; then
    echo "  ✓ MongoDB running"
    PATIENT_COUNT=$(mongosh $MONGO_DB --eval "db.patients.countDocuments({})" --quiet 2>/dev/null || echo "?")
    PLAN_COUNT=$(mongosh $MONGO_DB --eval "db.plans.countDocuments({})" --quiet 2>/dev/null || echo "?")
    SUPP_COUNT=$(mongosh $MONGO_DB --eval "db.supplements.countDocuments({})" --quiet 2>/dev/null || echo "?")
    echo "    Database: $MONGO_DB ($PATIENT_COUNT patients, $PLAN_COUNT plans, $SUPP_COUNT supplements)"
else
    echo -e "  ${YELLOW}⚠ Could not verify MongoDB${NC}"
fi

echo ""
echo "========================================="
echo -e " ${GREEN}Deployment complete!${NC}"
echo ""
echo " App:      https://$DOMAIN"
echo " Backend:  http://127.0.0.1:$BACKEND_PORT"
echo " Frontend: http://127.0.0.1:$FRONTEND_PORT"
echo " Database: mongodb://localhost:27017/$MONGO_DB"
echo ""
echo " PM2 commands:"
echo "   pm2 status"
echo "   pm2 logs ${APP_NAME}-backend"
echo "   pm2 logs ${APP_NAME}-frontend"
echo "   pm2 restart ${APP_NAME}-backend"
echo "   pm2 restart ${APP_NAME}-frontend"
echo ""
echo " First time? Don't forget:"
echo "   sudo certbot --nginx -d $DOMAIN"
echo "   pm2 startup && pm2 save"
echo "========================================="
