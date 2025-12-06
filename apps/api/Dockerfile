# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace packages
COPY packages/database ./packages/database
COPY packages/auth ./packages/auth
COPY apps/api ./apps/api

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npm run db:generate --workspace=@studysync/database

# Build the API
RUN npm run build --workspace=@studysync/api

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy built assets
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/auth ./packages/auth
COPY --from=builder /app/package.json ./package.json

USER expressjs

EXPOSE 3001

ENV PORT=3001

CMD ["node", "apps/api/dist/index.js"]
