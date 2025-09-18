# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Declaramos ARGs que queremos pasar desde docker-compose
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy all configuration files first
COPY tsconfig.json next.config.mjs postcss.config.mjs components.json ./

# Copy source code
COPY app ./app
COPY components ./components
COPY hooks ./hooks
COPY lib ./lib
COPY public ./public
COPY styles ./styles
COPY middleware.ts ./

# Build the application (las env ya están disponibles aquí)
RUN npm run build

# Development stage
FROM node:22-alpine AS development

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Declaramos ARGs que queremos pasar desde docker-compose
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copy package files first (for better caching)
COPY package.json package-lock.json pnpm-lock.yaml ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy configuration files only
COPY next.config.mjs postcss.config.mjs components.json ./
COPY tsconfig.json ./

# Don't copy source code here - it will be mounted via volume
# This allows hot reload to work properly

# Expose port
EXPOSE 3000

# Health check for development
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start in development mode
CMD ["npm", "run", "dev"]

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# ARG con valor por defecto
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./

# Necesario para runtime (solo si tienes otras env no públicas)
ENV NODE_ENV=production

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["npm", "start"]
