# Use bun image for faster multi-stage build
FROM oven/bun:1-alpine AS base
WORKDIR /app

# 1. Install dependencies (Cached layer)
FROM base AS install
# Copy workspace config and package files
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies including devDeps for build
# Use default bun install to get all dependencies
RUN bun install

# 2. Build the application
FROM base AS builder
COPY --from=install /app/node_modules ./node_modules
# Copy source code
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
# Build the API using bun's own build command
WORKDIR /app/apps/api
RUN bun run build

# 3. Production image
FROM node:20-alpine
WORKDIR /app

# Install production native dependencies
RUN npm install --production pg exceljs pdfkit

# Copy the built server and required internal assets (like migrations)
COPY --from=builder /app/apps/api/dist/server.js ./server.js
COPY --from=builder /app/apps/api/src/db/schema.sql ./src/db/schema.sql
COPY --from=builder /app/apps/api/migrations ./migrations

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "server.js"]
