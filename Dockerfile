# Backend Dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (ignore scripts for security)
RUN npm ci --only=production=false --ignore-scripts

# Copy source code
# Note: .dockerignore ensures sensitive files (.env, node_modules, etc.) are excluded
COPY src/ ./src/
COPY tsconfig.json ./
COPY server.ts ./

# Build TypeScript
RUN npm run build

# Create data directory for SQLite database (if needed)
RUN mkdir -p /app/src/data && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run migrations and start server
# Note: If migrations fail, the server won't start (fail-fast approach)
CMD npm run migration:run && npm start

