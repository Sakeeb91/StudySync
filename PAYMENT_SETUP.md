# Payment & Subscription Setup Guide (SSC-16)

This guide explains how to set up and configure the payment processing and subscription management system for StudySync.

## 🎯 Overview

StudySync uses **Stripe** for payment processing and subscription management. The system supports:

- ✅ Multiple subscription tiers (FREE, PREMIUM, STUDENT_PLUS, UNIVERSITY)
- ✅ Monthly and yearly billing options
- ✅ Free trials (7 days for Student Plus)
- ✅ Student discounts (20% off for .edu emails)
- ✅ Stripe Checkout for payment collection
- ✅ Stripe Customer Portal for billing management
- ✅ Webhooks for automatic subscription updates
- ✅ Invoice history and payment tracking
- ✅ Feature gating based on subscription tier
- ✅ Usage limits enforcement

## 📋 Prerequisites

- Stripe account (sign up at https://stripe.com)
- PostgreSQL database (for storing subscription data)
- Node.js 18+ and npm
- Access to the StudySync codebase

## 🔧 Setup Instructions

### 1. Create Stripe Account

1. Go to https://stripe.com and create an account
2. Complete the onboarding process
3. Access your Dashboard at https://dashboard.stripe.com

### 2. Get API Keys

1. In Stripe Dashboard, go to **Developers** → **API Keys**
2. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
4. Keep these keys secure!

### 3. Create Products and Prices

#### Premium Plan

1. Go to **Products** → **Add Product**
2. Name: "StudySync Premium"
3. Description: "Unlimited courses and advanced features"
4. Create two prices:
   - **Monthly**: $9.99/month (recurring)
   - **Yearly**: $99.99/year (recurring)
5. Copy the Price IDs (start with `price_`)

#### Student Plus Plan

1. Go to **Products** → **Add Product**
2. Name: "StudySync Student Plus"
3. Description: "All Premium features plus AI tutoring and exam prediction"
4. Create two prices:
   - **Monthly**: $14.99/month (recurring)
   - **Yearly**: $149.99/year (recurring)
5. Add a 7-day free trial to monthly pricing
6. Copy the Price IDs

### 4. Set Up Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/subscriptions/webhook`
   - For local development: Use ngrok or expose.dev to create a public URL
   - Example: `https://abc123.ngrok.io/api/subscriptions/webhook`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.created`
   - `customer.updated`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)

### 5. Configure Environment Variables

Update your `.env` file in the root directory:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your_secret_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_publishable_key_here"

# Stripe Price IDs
STRIPE_PRICE_PREMIUM_MONTHLY="price_xxx"
STRIPE_PRICE_PREMIUM_YEARLY="price_xxx"
STRIPE_PRICE_STUDENT_PLUS_MONTHLY="price_xxx"
STRIPE_PRICE_STUDENT_PLUS_YEARLY="price_xxx"

# Application URLs
FRONTEND_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 6. Run Database Migrations

Apply the payment-related schema changes:

```bash
npm run db:push
# or
npm run db:migrate
```

This will create the following tables:
- `Subscription` - Subscription history
- `Payment` - Payment transactions
- `Invoice` - Invoice records

### 7. Start the Application

```bash
# Start all services
npm run dev

# Or start individually
npm run dev --workspace=@studysync/web     # Frontend
npm run dev --workspace=@studysync/api     # Backend
```

## 🧪 Testing

### Test Mode

Stripe provides test mode for development:

1. Use test API keys (starting with `sk_test_` and `pk_test_`)
2. Use test card numbers:
   - **Success**: 4242 4242 4242 4242
   - **Decline**: 4000 0000 0000 0002
   - **3D Secure**: 4000 0025 0000 3155
   - **Insufficient funds**: 4000 0000 0000 9995
3. Use any future expiry date (e.g., 12/34)
4. Use any 3-digit CVC (e.g., 123)
5. Use any ZIP code (e.g., 12345)

### Testing Workflow

1. **Create Subscription**:
   - Go to http://localhost:3000/pricing
   - Click "Start Free Trial" on Premium or Student Plus
   - Use test card: 4242 4242 4242 4242
   - Complete checkout

2. **Verify Subscription**:
   - Check http://localhost:3000/subscription
   - Should show "Active" status
   - Should display correct billing cycle

3. **Test Webhooks**:
   - Make a change in Stripe Dashboard
   - Webhook should automatically update the database
   - Check API logs for webhook events

4. **Test Cancellation**:
   - Click "Manage Billing" on subscription page
   - Cancel subscription in Stripe portal
   - Verify status updates to "Canceled"

5. **Test Feature Gating**:
   - Try accessing premium features
   - Should show upgrade prompt for FREE tier users
   - Should allow access for PREMIUM/STUDENT_PLUS users

## 🎛️ Configuration

### Subscription Tiers

Edit `apps/api/src/config/pricing.ts` to modify:

- Pricing amounts
- Feature limits
- Trial periods
- Student discount percentage

### Feature Limits

Current limits per tier:

**FREE**:
- 1 course
- 3 flashcard sets
- 5 quizzes
- No knowledge graph
- No analytics

**PREMIUM**:
- Unlimited courses
- Unlimited flashcard sets
- Unlimited quizzes
- Knowledge graph ✓
- Analytics ✓

**STUDENT_PLUS**:
- All Premium features
- Exam prediction ✓
- Assignment help ✓
- 7-day free trial

### Modifying Subscription Plans

To add or modify plans:

1. Update `apps/api/src/config/pricing.ts`
2. Create corresponding products/prices in Stripe Dashboard
3. Add price IDs to environment variables
4. Update frontend pricing page
5. Update feature gating logic

## 🔒 Security

### Best Practices

1. **Never expose secret keys**:
   - Keep `STRIPE_SECRET_KEY` server-side only
   - Only use `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` on frontend

2. **Verify webhooks**:
   - All webhook events are signature-verified
   - Invalid signatures are rejected automatically

3. **Validate subscriptions**:
   - Always check subscription status server-side
   - Don't trust client-side subscription claims

4. **Use HTTPS in production**:
   - Stripe requires HTTPS for webhooks
   - Never use HTTP in production

5. **Secure customer data**:
   - All payment info is handled by Stripe
   - Never store raw credit card data
   - Follow PCI compliance guidelines

## 📊 Monitoring

### Stripe Dashboard

Monitor your subscriptions in Stripe Dashboard:

1. **Subscriptions**: View all active/canceled subscriptions
2. **Customers**: See customer payment methods and history
3. **Invoices**: Track all invoices and payments
4. **Payments**: Monitor payment intents and failures
5. **Events**: View all webhook events and delivery status

### Database Queries

Check subscription data in your database:

```sql
-- Get all active subscriptions
SELECT u.email, u.subscriptionTier, u.subscriptionStatus, u.subscriptionEnd
FROM "User" u
WHERE u.subscriptionStatus = 'ACTIVE';

-- Get subscription history
SELECT s.*, u.email
FROM "Subscription" s
JOIN "User" u ON s.userId = u.id
ORDER BY s.createdAt DESC;

-- Get payment history
SELECT p.*, u.email
FROM "Payment" p
JOIN "User" u ON p.userId = u.id
WHERE p.status = 'SUCCEEDED'
ORDER BY p.createdAt DESC;
```

## 🚨 Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint URL is correct
2. Ensure endpoint is publicly accessible
3. Verify webhook secret is correct
4. Check API logs for errors
5. Test webhook in Stripe Dashboard

### Subscription Not Updating

1. Check webhook delivery in Stripe Dashboard
2. Verify webhook event was processed (check API logs)
3. Ensure database connection is working
4. Check for errors in webhook handler

### Payment Failed

1. Check Stripe Dashboard for decline reason
2. Verify test card numbers are correct
3. Ensure customer has valid payment method
4. Check for insufficient funds or card errors

### Feature Gating Not Working

1. Verify user's subscription tier in database
2. Check subscription status is ACTIVE
3. Ensure feature gating middleware is applied
4. Check pricing configuration is correct

## 📚 Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Billing Best Practices](https://stripe.com/docs/billing/subscriptions/best-practices)

## 🎯 Success Criteria

Your payment system is properly configured when:

- ✅ Users can subscribe via Stripe Checkout
- ✅ Subscriptions automatically update in database
- ✅ Webhooks are received and processed
- ✅ Feature gating works correctly
- ✅ Billing portal allows subscription management
- ✅ Invoice history is accessible
- ✅ Payment failures are handled gracefully
- ✅ Free trials work as expected
- ✅ Student discounts are applied correctly
- ✅ Upgrade/downgrade flows function properly

## 📞 Support

For issues or questions:

1. Check this documentation
2. Review Stripe logs in Dashboard
3. Check API server logs
4. Consult Stripe support: https://support.stripe.com
5. Contact development team

---

**SSC-16 Implementation Complete!** 🎉

This payment system enables StudySync to:
- Generate revenue through subscriptions
- Provide tiered feature access
- Manage billing automatically
- Track payments and invoices
- Enforce usage limits
- Deliver premium value to paying users
