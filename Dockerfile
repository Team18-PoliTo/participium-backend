# Backend Dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files (this layer is cached separately for better cache hits)
COPY package*.json ./

# Install build dependencies for native module compilation
# py3-setuptools provides distutils (required by node-gyp for Python 3.12+)
# These are needed for: sqlite3, bcrypt, and any other native modules
RUN apk add --no-cache python3 py3-setuptools make g++

# Install dependencies (ignore scripts for security - we'll install native modules separately)
# This layer is cached separately, so if package.json doesn't change, we skip this
RUN npm ci --only=production=false --ignore-scripts --no-audit

# Install native modules - npm will use pre-built binaries when available (MUCH faster!)
# This runs the install scripts only for sqlite3 and bcrypt, which should download
# pre-built binaries for linux/amd64 and linux/arm64 instead of compiling
RUN npm install --no-save --ignore-scripts=false sqlite3 bcrypt

# Copy source code
# Note: .dockerignore ensures sensitive files (.env, node_modules, etc.) are excluded
COPY src/ ./src/
COPY tsconfig.json ./
COPY server.ts ./

# Build TypeScript (needs build tools for any potential native compilation during build)
RUN npm run build

# Remove build dependencies AFTER everything is built to reduce image size
RUN apk del python3 py3-setuptools make g++

# Create data directory for SQLite database
# Database path is dist/src/data/database.sqlite (relative to compiled database.js)
RUN mkdir -p /app/dist/src/data && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
# Note: initializeDatabase() in server.ts handles both:
# 1. synchronize() - creates all tables from entities
# 2. runMigrations() - runs seed data migrations
# This ensures tables exist before migrations try to insert data
CMD npm start

