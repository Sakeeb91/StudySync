# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StudySync is an AI-powered educational platform built as a monorepo using Turborepo. It transforms passive note-taking into active learning through AI-generated flashcards, quizzes, and study guides.

## Repository Structure

This is a Turborepo monorepo with the following workspace structure:
- `apps/web` - Next.js 14 frontend application (@studysync/web)
- `apps/api` - Express.js backend API server (@studysync/api)
- `packages/database` - Prisma ORM and database schema (@studysync/database)
- `packages/auth` - Shared authentication logic with JWT (@studysync/auth)
- `packages/ui` - Shared UI components (planned)
- `packages/shared` - Shared utilities (planned)

## Development Commands

### Initial Setup
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with actual values

# Start Docker services
docker-compose up -d

# Setup database
npm run db:push        # Push schema to database
npm run db:generate    # Generate Prisma client
```

### Daily Development
```bash
# Start all development servers concurrently
npm run dev

# Individual app development
npm run dev --workspace=@studysync/web    # Frontend only
npm run dev --workspace=@studysync/api    # Backend only

# Database operations
npm run db:studio      # Open Prisma Studio GUI
npm run db:migrate     # Run migrations in dev
npm run db:push        # Push schema changes without migration
```

### Building and Testing
```bash
# Build all packages
npm run build

# Run all tests
npm run test

# Lint all packages
npm run lint

# Format code
npm run format

# Clean build artifacts
npm run clean
```

### Running Specific Commands
```bash
# Run command in specific workspace
npm run <command> --workspace=@studysync/<package>

# Example: Run tests only for API
npm run test --workspace=@studysync/api
```

## Architecture Overview

### Authentication Flow
1. User credentials are validated using schemas in `packages/auth/src/index.ts`
2. Passwords are hashed using bcrypt with salt rounds of 10
3. JWT tokens are generated with 7-day expiration for access tokens
4. Refresh tokens have 30-day expiration
5. Session management includes user data and token expiry tracking

### Database Architecture
- PostgreSQL as primary database with Prisma ORM
- Redis for caching and rate limiting
- MinIO (optional) for S3-compatible file storage in development

Key models and relationships:
- `User` - Central user model with subscription tiers (FREE, PREMIUM, STUDENT_PLUS, UNIVERSITY)
- `Upload` - File uploads with processing status (PENDING, PROCESSING, COMPLETED, FAILED)
- `FlashcardSet` and `Flashcard` - Spaced repetition system with difficulty levels
- `Quiz`, `Question`, `Answer` - Quiz system supporting multiple question types
- `Note` and `NoteConnection` - Knowledge graph for concept relationships

### API Structure
The Express API (`apps/api/src/index.ts`) implements:
- Helmet for security headers
- CORS with credential support
- Rate limiting (100 requests per 15 minutes per IP)
- Structured routes: `/api/auth`, `/api/content`, `/api/flashcards`, `/api/quizzes`

### Frontend Architecture
Next.js 14 with App Router structure:
- TypeScript for type safety
- Tailwind CSS for styling
- Server components by default
- API calls to backend at `NEXT_PUBLIC_API_URL`

## Environment Configuration

Critical environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` and `JWT_REFRESH_SECRET` - Authentication tokens
- `OPENAI_API_KEY` - For AI features
- `REDIS_URL` - Redis connection
- `NEXT_PUBLIC_API_URL` - Backend API URL for frontend

Development defaults:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- MinIO Console: http://localhost:9001

## Turborepo Pipeline

The build pipeline (`turbo.json`) defines task dependencies:
- `build` depends on upstream builds (`^build`)
- `dev` runs persistently without caching
- `test` and `lint` depend on upstream tasks
- Environment variables are properly passed to build tasks

## Key Technical Decisions

1. **Monorepo with Turborepo**: Enables code sharing and coordinated deployments
2. **Prisma ORM**: Type-safe database access with migrations
3. **JWT Authentication**: Stateless auth with refresh token rotation
4. **Express + TypeScript**: Type-safe backend with familiar Node.js patterns
5. **Next.js 14 App Router**: Latest React patterns with server components
6. **PostgreSQL + Redis**: Relational data with caching layer

## AI Integration Points

The codebase is prepared for AI features:
- OpenAI SDK configured in API dependencies
- LangChain for AI orchestration
- Content processing pipeline in `Upload` model
- Vector database support planned for semantic search

## Common Development Patterns

### Adding New API Routes
1. Create route handler in `apps/api/src/routes/`
2. Add validation schemas using Zod
3. Implement business logic with Prisma client
4. Add rate limiting if needed
5. Update CORS settings if required

### Database Schema Changes
1. Modify `packages/database/prisma/schema.prisma`
2. Run `npm run db:migrate` to create migration
3. Run `npm run db:generate` to update client
4. Update dependent packages as needed

### Adding Shared Packages
1. Create new directory in `packages/`
2. Add package.json with `@studysync/` namespace
3. Update root `package.json` workspaces if needed
4. Configure TypeScript with proper build output

## Current Implementation Status

Completed (SSC-5):
- Project architecture and setup
- Database schema design
- Authentication package structure
- Basic API structure
- Frontend scaffolding
- CI/CD pipeline configuration

Pending (from Linear roadmap):
- SSC-10: User Authentication implementation
- SSC-6: Content Upload system
- SSC-7: AI Flashcard generation
- SSC-8: Quiz system
- SSC-9: Core UI/UX implementation