# ============================================================================
# AUTH SERVICE DOCKERFILE
# ============================================================================
# Multi-stage build for production-ready container
# ============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/auth-service/package*.json ./apps/auth-service/
COPY libs/contracts/package*.json ./libs/contracts/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY libs/contracts ./libs/contracts
COPY apps/auth-service ./apps/auth-service

# Build the application
WORKDIR /app/apps/auth-service
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy built application - note: build creates nested structure
COPY --from=builder /app/apps/auth-service/dist ./dist
COPY --from=builder /app/apps/auth-service/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production

# Expose TCP port
EXPOSE 3001

# Start the service - main.js is at dist/apps/auth-service/src/main.js
CMD ["node", "dist/apps/auth-service/src/main.js"]
