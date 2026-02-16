# Multi-stage build for Dr. Shumard Protocol Manager

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/yarn.lock* ./
RUN yarn install --frozen-lockfile 2>/dev/null || yarn install
COPY frontend/ .
RUN REACT_APP_BACKEND_URL= yarn build

# Stage 2: Production
FROM python:3.11-slim
WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend
COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Nginx config
RUN echo 'server { \
    listen 80; \
    server_name _; \
    \
    location /api/ { \
        proxy_pass http://127.0.0.1:8001; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    location / { \
        root /app/frontend/build; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/sites-available/default

# Startup script
RUN echo '#!/bin/bash\nset -e\nnginx\ncd /app/backend\nexec uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2' > /app/start.sh \
    && chmod +x /app/start.sh

EXPOSE 80

CMD ["/app/start.sh"]
