# ============================================================================
# EVENTS SERVICE DOCKERFILE
# ============================================================================
# Multi-stage build for production-ready container
# ============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/events-service/package*.json ./apps/events-service/
COPY libs/contracts/package*.json ./libs/contracts/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY libs/contracts ./libs/contracts
COPY apps/events-service ./apps/events-service

# Build the application
WORKDIR /app/apps/events-service
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy built application - note: build creates nested structure
COPY --from=builder /app/apps/events-service/dist ./dist
COPY --from=builder /app/apps/events-service/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production

# Expose TCP port
EXPOSE 3002

# Start the service - main.js is at dist/apps/events-service/src/main.js
CMD ["node", "dist/apps/events-service/src/main.js"]
