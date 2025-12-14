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

### Payment & Subscription System (SSC-16)
Stripe integration for subscription management with feature gating.

**Backend Components:**
- `apps/api/src/config/stripe.ts` - Stripe client initialization
- `apps/api/src/config/pricing.ts` - Subscription tiers and feature limits
- `apps/api/src/services/stripe.service.ts` - Customer, subscription, payment operations
- `apps/api/src/controllers/subscription.controller.ts` - Subscription endpoints
- `apps/api/src/controllers/webhook.controller.ts` - Stripe webhook handlers
- `apps/api/src/middleware/subscription.middleware.ts` - Usage limit enforcement

**Frontend Components:**
- `apps/web/src/contexts/subscription-context.tsx` - Global subscription state
- `apps/web/src/lib/subscription-api.ts` - Subscription API client
- `apps/web/src/components/subscription/FeatureGate.tsx` - Premium feature wrapper
- `apps/web/src/components/subscription/UpgradeDialog.tsx` - Upgrade prompt modal
- `apps/web/src/app/pricing/page.tsx` - Pricing page with checkout flow
- `apps/web/src/app/(dashboard)/subscription/page.tsx` - Subscription management
- `apps/web/src/app/checkout/success/page.tsx` - Checkout success page
- `apps/web/src/app/checkout/cancel/page.tsx` - Checkout cancel page

**Subscription Tiers:**
- FREE: 1 course, 3 flashcard sets, 5 quizzes, basic AI
- PREMIUM ($9.99/mo): Unlimited everything, knowledge graph, analytics
- STUDENT_PLUS ($14.99/mo): Premium + exam prediction, AI tutoring, 7-day trial
- UNIVERSITY: Custom enterprise pricing

**Subscription API Endpoints:**
- `GET /api/subscriptions/plans` - Get all plans (public)
- `GET /api/subscriptions/current` - Current subscription status
- `POST /api/subscriptions/checkout` - Create Stripe checkout session
- `POST /api/subscriptions/portal` - Create Stripe billing portal
- `PUT /api/subscriptions/cancel` - Cancel subscription
- `PUT /api/subscriptions/reactivate` - Reactivate canceled subscription
- `GET /api/subscriptions/invoices` - Invoice history
- `GET /api/subscriptions/usage` - Usage statistics
- `POST /api/subscriptions/promo` - Validate promo code
- `POST /api/subscriptions/webhook` - Stripe webhook receiver

**Feature Gating:**
- Knowledge graph routes require PREMIUM tier or higher
- Flashcard/quiz/upload creation checks tier limits
- `requireSubscription(tiers)` middleware for tier enforcement
- `requireFeature(feature)` middleware for feature access
- Usage limits enforced via `checkFlashcardSetLimit`, `checkQuizLimit`, `checkUploadLimit`

## Environment Variables

Required (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` / `JWT_REFRESH_SECRET` - Auth tokens
- `REDIS_URL` - Caching
- `OPENAI_API_KEY` - AI features
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_PRICE_PREMIUM_MONTHLY` - Stripe price ID for Premium monthly
- `STRIPE_PRICE_PREMIUM_YEARLY` - Stripe price ID for Premium yearly
- `STRIPE_PRICE_STUDENT_PLUS_MONTHLY` - Stripe price ID for Student Plus monthly
- `STRIPE_PRICE_STUDENT_PLUS_YEARLY` - Stripe price ID for Student Plus yearly

Ports: Frontend :3000, API :3001, PostgreSQL :5432, Redis :6379, MinIO :9001

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
1. Lint → 2. Tests (with PostgreSQL) → 3. Build → 4. Security scan
- PRs: Deploy preview
- Main branch: Deploy production

### CI/CD Best Practices (MUST FOLLOW)

To ensure CI/CD checks pass on the first push, follow these rules when writing code:

#### 1. TypeScript Strict Mode
- **No unused variables**: Remove any variable that is declared but never used
- **No unused imports**: Remove imports that aren't used in the file
- **Use Prisma enums directly**: When working with Prisma enum fields (like `SubscriptionStatus`, `SubscriptionTier`), import and use the enum from `@prisma/client`:
  ```typescript
  import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';

  // CORRECT
  const status = SubscriptionStatus.ACTIVE;

  // WRONG - will fail TypeScript
  const status = 'ACTIVE';
  ```

#### 2. Next.js 14 App Router Rules
- **Wrap `useSearchParams()` in Suspense**: Any component using `useSearchParams()` must be wrapped in a Suspense boundary:
  ```typescript
  // CORRECT
  function PageContent() {
    const searchParams = useSearchParams();
    // ...
  }

  export default function Page() {
    return (
      <Suspense fallback={<Loading />}>
        <PageContent />
      </Suspense>
    );
  }
  ```
- **Client components**: Add `"use client"` directive at top of files using React hooks
- **Avoid `any` types**: Use proper TypeScript types instead of `any`

#### 3. ESLint Rules
- **No `@typescript-eslint/no-unused-vars` errors**: Check all imports and variables are used
- **Avoid `@typescript-eslint/no-explicit-any`**: Use specific types or `unknown` instead
- **Run `npm run lint` locally** before committing to catch issues early

#### 4. External Library Compatibility
- **Stripe SDK**: Use the API version that matches the installed SDK types
  ```typescript
  // Check package.json for stripe version, use matching apiVersion
  apiVersion: '2025-11-17.clover'  // Must match SDK types
  ```
- **Type casting for SDK changes**: When SDK types don't match runtime properties:
  ```typescript
  // Cast to add missing properties
  const sub = subscription as Stripe.Subscription & {
    current_period_end: number;
  };
  ```

#### 5. Pre-Push Checklist
Before pushing code, run these commands locally:
```bash
npm run lint          # Must pass with no errors (warnings OK)
npm run build         # Must complete successfully
npm run test          # All tests must pass
```

#### 6. Common Fixes for CI Failures

| Error | Fix |
|-------|-----|
| `'X' is defined but never used` | Remove the unused import/variable |
| `Type 'string' is not assignable to type 'EnumType'` | Import and use the Prisma enum directly |
| `useSearchParams() should be wrapped in suspense` | Wrap component in `<Suspense>` |
| `Property 'X' does not exist on type` | Add type cast or update to correct API |
| `Unexpected any` | Replace `any` with proper type or `unknown` |

#### 7. Stripe-Specific Guidelines
- Always import enums from Prisma for database operations
- Use type assertions for Stripe webhook event data
- Match Stripe API version to SDK types in `apps/api/src/config/stripe.ts`
- Use `discounts` array instead of deprecated `promotion_code` property

## Docker

`docker-compose.yml` provides PostgreSQL 15, Redis 7, MinIO (S3-compatible storage).

API Dockerfile uses multi-stage build with non-root user.
