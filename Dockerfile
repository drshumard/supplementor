# syntax=docker/dockerfile:1.6
# Dr. Shumard Protocol Manager — single-container image (nginx + FastAPI)

# ─────────────────────────────────────────────
# Stage 1: build React frontend
# ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

ARG CLERK_PUBLISHABLE_KEY=""

COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY frontend/ ./
# Neutralize the hardcoded window.__CLERK_PK in public/index.html so the CRA
# env var fallback (REACT_APP_CLERK_PUBLISHABLE_KEY) wins at runtime.
RUN sed -i 's|window\.__CLERK_PK="[^"]*"|window.__CLERK_PK=""|' public/index.html
# API is served from same origin via nginx /api/ proxy, so leave base URL empty.
# Clerk key is baked in at build time via CRA's REACT_APP_* env inlining.
ENV REACT_APP_BACKEND_URL="" \
    REACT_APP_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY
RUN yarn build


# ─────────────────────────────────────────────
# Stage 2: runtime (python + nginx)
# ─────────────────────────────────────────────
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx curl \
 && rm -rf /var/lib/apt/lists/*

# Python deps first for better layer caching
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Backend source
COPY backend/ ./backend/

# Built frontend from stage 1
COPY --from=frontend-build /app/frontend/build ./frontend/build

# nginx: proxy /api/ to uvicorn, serve SPA otherwise
RUN rm -f /etc/nginx/sites-enabled/default
COPY <<'NGINX_CONF' /etc/nginx/sites-available/app.conf
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 25M;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location / {
        root /app/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
NGINX_CONF
RUN ln -sf /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/app.conf

# Entrypoint: run uvicorn + nginx, exit if either dies
COPY <<'START_SH' /app/start.sh
#!/bin/bash
set -e

cd /app/backend
uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2 &
BACKEND_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

trap 'kill -TERM $BACKEND_PID $NGINX_PID 2>/dev/null' TERM INT
wait -n $BACKEND_PID $NGINX_PID
exit $?
START_SH
RUN chmod +x /app/start.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fs http://127.0.0.1/api/health || exit 1

CMD ["/app/start.sh"]
