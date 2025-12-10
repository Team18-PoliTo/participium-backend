# Backend Dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY package*.json ./

# Install required build tools for native modules
RUN apk add --no-cache g++ make py3-setuptools python3

RUN npm ci --only=production=false --no-audit

COPY src/ ./src/
COPY tsconfig.json ./
COPY server.ts ./

# Build the TypeScript project
RUN npm run build

# Remove build tools AFTER build is complete
RUN apk del python3 py3-setuptools make g++

# Prepare SQLite database directory
RUN mkdir -p /app/dist/src/data && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["npm", "start"]