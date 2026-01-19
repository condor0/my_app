# API GATEWAY DOCKERFILE
# Multi-stage build for production-ready container

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api-gateway/package*.json ./apps/api-gateway/
COPY libs/contracts/package*.json ./libs/contracts/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY libs/contracts ./libs/contracts
COPY apps/api-gateway ./apps/api-gateway

# Build the application
WORKDIR /app/apps/api-gateway
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy built application - note: build creates nested structure
COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/apps/api-gateway/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production

# Expose HTTP port
EXPOSE 3000

# Start the gateway - main.js is at dist/apps/api-gateway/src/main.js
CMD ["node", "dist/apps/api-gateway/src/main.js"]
