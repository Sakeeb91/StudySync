# SSC-16: Payment Processing & Subscription Management - Implementation Plan

## Overview
Implement complete payment processing and subscription management system using Stripe for StudySync.

## Tech Stack
- **Payment Processor**: Stripe
- **Backend**: Express.js + Prisma
- **Frontend**: Next.js 14 (App Router)
- **Database**: PostgreSQL

## Current State Analysis
✅ User model has `subscriptionTier` (FREE, PREMIUM, STUDENT_PLUS, UNIVERSITY)
✅ User model has `subscriptionEnd` DateTime field
✅ Auth middleware has `requireSubscription()` function
✅ Stripe keys already in .env.example
✅ JWT authentication working

## Implementation Stages (25 Atomic Commits)

### Phase 1: Database Schema (Commits 1-4)

**Commit 1**: Add Stripe customer fields to User model
- Add `stripeCustomerId` (String?, @unique)
- Add `stripeSubscriptionId` (String?, @unique)
- Add `subscriptionStatus` enum (ACTIVE, CANCELED, PAST_DUE, TRIALING, INCOMPLETE)

**Commit 2**: Create Subscription model for history tracking
- Model: Subscription (id, userId, stripeSub scriptionId, priceId, status, currentPeriodStart/End, cancelAtPeriodEnd, createdAt, updatedAt)
- Relations to User

**Commit 3**: Create Payment model for transaction tracking
- Model: Payment (id, userId, stripePaymentIntentId, amount, currency, status, description, metadata, createdAt)
- Relations to User

**Commit 4**: Create Invoice model for billing history
- Model: Invoice (id, userId, stripeInvoiceId, amountDue, amountPaid, status, invoiceUrl, pdfUrl, createdAt)
- Relations to User

### Phase 2: Backend - Stripe Integration (Commits 5-10)

**Commit 5**: Install Stripe SDK and setup configuration
- Add `stripe` package to API dependencies
- Create `src/config/stripe.ts` with Stripe client initialization
- Add Stripe type definitions

**Commit 6**: Create Stripe service for customer operations
- Create `src/services/stripe.service.ts`
- Functions: createCustomer, getCustomer, updateCustomer, deleteCustomer

**Commit 7**: Create Stripe service for subscription operations
- Add to stripe.service.ts
- Functions: createSubscription, updateSubscription, cancelSubscription, reactivateSubscription

**Commit 8**: Create Stripe service for payment operations
- Add to stripe.service.ts
- Functions: createPaymentIntent, createCheckoutSession, getPaymentMethod, attachPaymentMethod

**Commit 9**: Create pricing configuration file
- Create `src/config/pricing.ts`
- Define subscription tiers with Stripe price IDs
- Features matrix per tier

**Commit 10**: Create subscription validation utilities
- Create `src/utils/subscription.utils.ts`
- Functions: hasActiveSubscription, canAccessFeature, getSubscriptionLimits

### Phase 3: Backend - API Routes (Commits 11-14)

**Commit 11**: Create subscription controller
- Create `src/controllers/subscription.controller.ts`
- Methods: getSubscriptionPlans, getCurrentSubscription, getUsageStats

**Commit 12**: Create checkout controller
- Add to subscription.controller.ts
- Methods: createCheckoutSession, handleCheckoutSuccess, upgradeSubscription

**Commit 13**: Create billing portal controller
- Add to subscription.controller.ts
- Methods: createPortalSession, getInvoices, getPaymentHistory

**Commit 14**: Create subscription routes
- Create `src/routes/subscription.routes.ts`
- Wire up all subscription endpoints
- Add to main app.ts

### Phase 4: Backend - Webhook System (Commits 15-16)

**Commit 15**: Create webhook controller and validation
- Create `src/controllers/webhook.controller.ts`
- Stripe signature verification
- Event type routing

**Commit 16**: Implement webhook event handlers
- Handle: customer.subscription.created/updated/deleted
- Handle: invoice.paid/payment_failed
- Handle: customer.created/updated
- Update database accordingly

### Phase 5: Frontend - Pricing & Checkout (Commits 17-20)

**Commit 17**: Create pricing page UI
- Create `apps/web/src/app/pricing/page.tsx`
- PricingCard component with tier comparison
- Feature lists per tier
- CTA buttons

**Commit 18**: Create checkout flow UI
- Create `apps/web/src/app/checkout/page.tsx`
- Stripe Elements integration
- Payment form component
- Success/cancel redirects

**Commit 19**: Create subscription management page
- Create `apps/web/src/app/(dashboard)/subscription/page.tsx`
- Current plan display
- Usage stats
- Upgrade/downgrade CTA
- Cancel subscription option

**Commit 20**: Create billing portal page
- Create `apps/web/src/app/(dashboard)/billing/page.tsx`
- Invoice history
- Payment method management
- Billing portal redirect

### Phase 6: Frontend - Feature Gating (Commits 21-23)

**Commit 21**: Create subscription context provider
- Create `apps/web/src/contexts/SubscriptionContext.tsx`
- Fetch user subscription status
- Provide subscription state globally

**Commit 22**: Create feature gate components
- Create `apps/web/src/components/subscription/FeatureGate.tsx`
- Create `apps/web/src/components/subscription/UpgradePrompt.tsx`
- Wrap premium features

**Commit 23**: Add upgrade prompts to existing features
- Add to flashcards (limit to 3 sets on FREE)
- Add to quizzes (limit to 5 quizzes on FREE)
- Add to knowledge graph (premium only)
- Add to analytics (premium only)

### Phase 7: Testing & Polish (Commits 24-25)

**Commit 24**: Add subscription middleware to protected routes
- Update existing routes with subscription requirements
- Add proper error messages for insufficient permissions
- Update API documentation

**Commit 25**: Add comprehensive README and environment setup
- Document Stripe setup process
- Add testing instructions with Stripe test mode
- Add webhook endpoint documentation
- Update main README.md with payment features

## Feature Requirements Checklist

### Subscription Tiers
- [ ] FREE: 1 course, 3 flashcard sets, 5 quizzes, basic features
- [ ] PREMIUM ($9.99/mo): Unlimited courses, unlimited content, advanced features, priority support
- [ ] STUDENT_PLUS ($14.99/mo): All Premium + exam prediction, AI tutoring, analytics dashboard

### Payment Features
- [ ] Multiple payment methods (card, Apple Pay, Google Pay)
- [ ] Annual plan discount (2 months free = $99.99/year for Premium)
- [ ] Student email verification for discounts (.edu emails = 20% off)
- [ ] Team/group pricing (future: 5+ users)
- [ ] University partnership bulk licenses (future)

### User Flow
- [ ] Browse pricing page
- [ ] Select plan
- [ ] Stripe Checkout redirect
- [ ] Payment processing
- [ ] Webhook updates subscription
- [ ] Redirect to success page
- [ ] Access premium features

### Billing Management
- [ ] View current subscription
- [ ] View usage stats
- [ ] Upgrade/downgrade subscription
- [ ] Cancel subscription (at period end)
- [ ] Reactivate subscription
- [ ] View invoice history
- [ ] Download invoices
- [ ] Update payment method
- [ ] Apply discount codes

### Webhook Events
- [ ] customer.subscription.created
- [ ] customer.subscription.updated
- [ ] customer.subscription.deleted
- [ ] invoice.paid
- [ ] invoice.payment_failed
- [ ] customer.created
- [ ] customer.updated
- [ ] payment_intent.succeeded
- [ ] payment_intent.payment_failed

### Error Handling
- [ ] Payment failed (retry logic)
- [ ] Subscription expired (grace period)
- [ ] Downgrade handling (feature access revoked)
- [ ] Webhook retry mechanism
- [ ] Idempotency for payment operations

### Analytics & Metrics
- [ ] Track free-to-paid conversion rate (target: 30%)
- [ ] Track monthly churn rate (target: <5%)
- [ ] Track MRR (Monthly Recurring Revenue)
- [ ] Track ARPU (Average Revenue Per User)
- [ ] Track failed payment rate (target: <5%)

## API Endpoints

### Subscription Endpoints
```
GET    /api/subscriptions/plans           - Get all pricing plans
GET    /api/subscriptions/current         - Get current subscription (protected)
POST   /api/subscriptions/checkout        - Create checkout session (protected)
POST   /api/subscriptions/portal          - Create billing portal session (protected)
PUT    /api/subscriptions/upgrade         - Upgrade subscription (protected)
PUT    /api/subscriptions/cancel          - Cancel subscription (protected)
PUT    /api/subscriptions/reactivate      - Reactivate subscription (protected)
GET    /api/subscriptions/invoices        - Get invoice history (protected)
GET    /api/subscriptions/usage           - Get usage stats (protected)
```

### Webhook Endpoint
```
POST   /api/webhooks/stripe               - Stripe webhook receiver (public, signature verified)
```

## Database Schema Changes

### User Model Updates
```prisma
model User {
  // ... existing fields
  stripeCustomerId      String?   @unique
  stripeSubscriptionId  String?   @unique
  subscriptionStatus    SubscriptionStatus @default(INACTIVE)
  subscriptionTier      SubscriptionTier @default(FREE)
  subscriptionEnd       DateTime?
  trialEndsAt           DateTime?

  // Relations
  subscriptions         Subscription[]
  payments              Payment[]
  invoices              Invoice[]
}
```

### New Models
```prisma
model Subscription {
  id                    String    @id @default(cuid())
  userId                String
  stripeSubscriptionId  String    @unique
  stripePriceId         String
  status                SubscriptionStatus
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  cancelAtPeriodEnd     Boolean   @default(false)
  canceledAt            DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user                  User      @relation(fields: [userId], references: [id])
}

model Payment {
  id                    String    @id @default(cuid())
  userId                String
  stripePaymentIntentId String    @unique
  amount                Int       // in cents
  currency              String    @default("usd")
  status                PaymentStatus
  description           String?
  metadata              Json?
  createdAt             DateTime  @default(now())

  user                  User      @relation(fields: [userId], references: [id])
}

model Invoice {
  id                    String    @id @default(cuid())
  userId                String
  stripeInvoiceId       String    @unique
  amountDue             Int       // in cents
  amountPaid            Int       // in cents
  status                InvoiceStatus
  invoiceUrl            String?
  pdfUrl                String?
  dueDate               DateTime?
  paidAt                DateTime?
  createdAt             DateTime  @default(now())

  user                  User      @relation(fields: [userId], references: [id])
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  TRIALING
  INCOMPLETE
  INCOMPLETE_EXPIRED
  INACTIVE
}

enum PaymentStatus {
  SUCCEEDED
  PROCESSING
  REQUIRES_ACTION
  REQUIRES_PAYMENT_METHOD
  CANCELED
  FAILED
}

enum InvoiceStatus {
  DRAFT
  OPEN
  PAID
  UNCOLLECTIBLE
  VOID
}
```

## Environment Variables

Required additions to `.env`:
```bash
# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Stripe Price IDs (from Stripe Dashboard)
STRIPE_PRICE_PREMIUM_MONTHLY="price_..."
STRIPE_PRICE_PREMIUM_YEARLY="price_..."
STRIPE_PRICE_STUDENT_PLUS_MONTHLY="price_..."
STRIPE_PRICE_STUDENT_PLUS_YEARLY="price_..."
```

## Testing Strategy

### Stripe Test Mode
- Use Stripe test mode for development
- Test card numbers:
  - Success: 4242 4242 4242 4242
  - Decline: 4000 0000 0000 0002
  - 3D Secure: 4000 0025 0000 3155

### Test Scenarios
1. Successful subscription creation
2. Failed payment handling
3. Subscription upgrade/downgrade
4. Subscription cancellation
5. Webhook event processing
6. Invoice generation
7. Payment retry logic
8. Student discount application

## Success Criteria

✅ All 25 commits completed
✅ Users can subscribe to Premium/Student Plus tiers
✅ Stripe checkout flow works end-to-end
✅ Webhooks process events correctly
✅ Feature gating enforces subscription limits
✅ Billing portal allows subscription management
✅ Invoice history is accessible
✅ Payment failure handling works
✅ Upgrade/downgrade flows work correctly
✅ <5% failed payment rate
✅ Documentation complete

## Revenue Goals (from Linear)

- Month 4-6: $5K MRR
- Month 7-12: $50K MRR
- Year 2: $500K MRR
- Target conversion: 30%+ free-to-paid
- Target churn: <5% monthly

## Notes

- Stripe Elements will be used for PCI-compliant payment collection
- All prices in USD cents (e.g., $9.99 = 999)
- Annual plans offer 2 months free (20% discount)
- Student verification via .edu email = additional 20% off
- Subscriptions renew automatically
- Downgrades take effect at period end
- Upgrades are prorated and take effect immediately
- 7-day free trial for Student Plus tier
