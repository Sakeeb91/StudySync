import { Router, Request, Response, NextFunction } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { WebhookController } from '../controllers/webhook.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import express from 'express';

const router = Router();
const subscriptionController = new SubscriptionController();
const webhookController = new WebhookController();

// Public routes

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', (req: Request, res: Response, next: NextFunction) =>
  subscriptionController.getPlans(req, res, next)
);

// Protected routes (require authentication)

/**
 * GET /api/subscriptions/current
 * Get current user's subscription status
 */
router.get('/current', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  subscriptionController.getCurrentSubscription(req, res, next)
);

/**
 * POST /api/subscriptions/checkout
 * Create checkout session for subscription
 */
router.post('/checkout', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  subscriptionController.createCheckout(req, res, next)
);

/**
 * POST /api/subscriptions/portal
 * Create billing portal session
 */
router.post('/portal', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  subscriptionController.createPortalSession(req, res, next)
);

/**
 * PUT /api/subscriptions/cancel
 * Cancel current subscription
 */
router.put('/cancel', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  subscriptionController.cancelSubscription(req, res, next)
);

/**
 * PUT /api/subscriptions/reactivate
 * Reactivate canceled subscription
 */
router.put('/reactivate', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  subscriptionController.reactivateSubscription(req, res, next)
);

/**
 * GET /api/subscriptions/invoices
 * Get invoice history
 */
router.get('/invoices', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  subscriptionController.getInvoices(req, res, next)
);

/**
 * GET /api/subscriptions/usage
 * Get usage statistics
 */
router.get('/usage', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  subscriptionController.getUsageStats(req, res, next)
);

// Webhook routes (Stripe signature verification)

/**
 * POST /api/subscriptions/webhook
 * Handle Stripe webhooks
 * Note: Must use raw body for signature verification
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req: Request, res: Response) => webhookController.handleWebhook(req, res)
);

export default router;
