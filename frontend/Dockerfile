# ── Frontend Dockerfile (multi-stage) ───────────────────────────────────────
# Stage 1: Build the React app with Node
# Stage 2: Serve the built static files with nginx (lightweight web server)

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cached unless package.json changes)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build
# Output goes to /app/dist

# --- Stage 2: Serve ---
FROM nginx:alpine

# Copy the built React app into nginx's public folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config so that React Router (client-side routing) works
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
