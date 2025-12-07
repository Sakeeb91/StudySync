# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StudySync is an AI-powered educational platform that transforms passive note-taking into active learning through AI-generated flashcards, quizzes, and study guides. Built as a Turborepo monorepo.

## Development Commands

```bash
# Start all services (frontend + backend)
npm run dev

# Run single workspace
npm run dev --workspace=@studysync/web     # Frontend on :3000
npm run dev --workspace=@studysync/api     # Backend on :3001

# Database (requires Docker services running first)
docker-compose up -d                       # Start PostgreSQL, Redis, MinIO
npm run db:push                            # Push schema changes
npm run db:generate                        # Generate Prisma client
npm run db:studio                          # Open Prisma GUI
npm run db:migrate                         # Run migrations

# Testing and linting
npm run lint                               # Lint all packages
npm run test                               # Run all tests
npm run test --workspace=@studysync/api    # Test single package

# Build
npm run build                              # Build all packages
npm run clean                              # Remove build artifacts and node_modules
```

## Repository Structure

```
apps/
  web/           # Next.js 14 frontend (@studysync/web) - src/app/ uses App Router
  api/           # Express.js backend (@studysync/api)
packages/
  database/      # Prisma schema and client (@studysync/database)
  auth/          # JWT authentication logic (@studysync/auth)
  shared/        # Shared utilities (planned)
  ui/            # Shared UI components (planned)
```

## Architecture

### Package Dependencies
```
@studysync/web → (calls API endpoints)
@studysync/api → @studysync/auth → @studysync/database
```

### Authentication Flow
1. `packages/auth/src/index.ts` - Validation schemas (Zod), password hashing (bcrypt), JWT utilities
2. `apps/api/src/routes/auth.routes.ts` - Auth endpoints with stricter rate limiting (10 req/15min)
3. `apps/api/src/middleware/auth.middleware.ts` - `authenticateToken`, `optionalAuth`, `requireSubscription` middleware
4. `apps/api/src/controllers/auth.controller.ts` - Full auth implementation

Token expiration: Access 7 days, Refresh 30 days. Sessions stored in database.

### Auth API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Invalidate session (protected)
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/me` - Update profile (protected)
- `PUT /api/auth/me/password` - Change password (protected)
- `DELETE /api/auth/me` - Delete account (protected)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset with token
- `GET /api/auth/verify-email/:token` - Email verification

### Database Models
Key models in `packages/database/prisma/schema.prisma`:
- `User` - Subscription tiers: FREE, PREMIUM, STUDENT_PLUS, UNIVERSITY
- `Session` - JWT refresh tokens and verification tokens
- `Upload` - Processing status: PENDING → PROCESSING → COMPLETED/FAILED
- `FlashcardSet`/`Flashcard` - Spaced repetition with EASY/MEDIUM/HARD difficulty
- `Quiz`/`Question`/`Answer` - Types: MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY
- `Note`/`NoteConnection` - Knowledge graph for concept relationships

### Request Validation
All inputs validated with Zod schemas. Auth schemas exported from `@studysync/auth`.

## Environment Variables

Required (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` / `JWT_REFRESH_SECRET` - Auth tokens
- `REDIS_URL` - Caching
- `OPENAI_API_KEY` - AI features

Ports: Frontend :3000, API :3001, PostgreSQL :5432, Redis :6379, MinIO :9001

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
1. Lint → 2. Tests (with PostgreSQL) → 3. Build → 4. Security scan
- PRs: Deploy preview
- Main branch: Deploy production

## Docker

`docker-compose.yml` provides PostgreSQL 15, Redis 7, MinIO (S3-compatible storage).

API Dockerfile uses multi-stage build with non-root user.
