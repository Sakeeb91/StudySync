# Root Dockerfile for development with docker-compose
# For production, use apps/api/Dockerfile and apps/web/Dockerfile

FROM node:18-alpine

WORKDIR /app

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY turbo.json ./

# Copy all workspace package.json files
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/auth/package.json ./packages/auth/

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npm run db:generate --workspace=@studysync/database || true

EXPOSE 3000 3001

# Default command runs development
CMD ["npm", "run", "dev"]
