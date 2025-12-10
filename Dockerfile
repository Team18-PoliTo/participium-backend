# Backend Dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY package*.json ./

# Update package index and install required build tools for native modules
# Using --virtual to group packages and ensure clean removal
RUN apk update && apk add --no-cache --virtual .build-deps \
    g++ \
    make \
    python3 \
    py3-setuptools

RUN npm ci --only=production=false --no-audit

COPY src/ ./src/
COPY tsconfig.json ./
COPY server.ts ./

# Build the TypeScript project
RUN npm run build

# Remove build tools AFTER build is complete
RUN apk del .build-deps

# Prepare SQLite database directory
RUN mkdir -p /app/dist/src/data && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["npm", "start"]