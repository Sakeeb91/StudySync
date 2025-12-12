import { Request, Response, NextFunction } from 'express';
import { stripeService } from '../services/stripe.service';
import { PrismaClient } from '@prisma/client';
import { getAllPlans, getPlanByTier } from '../config/pricing';
import {
  getSubscriptionStatus,
  getSubscriptionLimits,
  hasActiveSubscription,
} from '../utils/subscription.utils';

const prisma = new PrismaClient();

export class SubscriptionController {
  /**
   * Get all subscription plans
   */
  async getPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = getAllPlans();
      res.json({ plans });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's subscription
   */
  async getCurrentSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const status = await getSubscriptionStatus(userId);
      const limits = await getSubscriptionLimits(userId);
      const plan = getPlanByTier(status.tier);

      res.json({
        subscription: {
          tier: status.tier,
          status: status.status,
          isActive: status.isActive,
          daysUntilRenewal: status.daysUntilRenewal,
          cancelAtPeriodEnd: status.cancelAtPeriodEnd,
          plan,
        },
        limits,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create checkout session
   */
  async createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { priceId, billingPeriod = 'monthly' } = req.body;

      if (!priceId) {
        res.status(400).json({ error: 'Price ID is required' });
        return;
      }

      // Get or create Stripe customer
      const customer = await stripeService.getOrCreateCustomer(userId);

      // Create checkout session
      const session = await stripeService.createCheckoutSession(
        customer.id,
        priceId,
        {
          successUrl: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${process.env.FRONTEND_URL}/pricing`,
          trialPeriodDays: billingPeriod === 'monthly' ? 0 : undefined, // No trial for monthly
          metadata: {
            userId,
            billingPeriod,
          },
        }
      );

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create billing portal session
   */
  async createPortalSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        res.status(400).json({ error: 'No payment account found' });
        return;
      }

      const session = await stripeService.createBillingPortalSession(
        user.stripeCustomerId,
        `${process.env.FRONTEND_URL}/subscription`
      );

      res.json({ url: session.url });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { immediately = false } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeSubscriptionId: true },
      });

      if (!user?.stripeSubscriptionId) {
        res.status(400).json({ error: 'No active subscription found' });
        return;
      }

      const subscription = await stripeService.cancelSubscription(
        user.stripeSubscriptionId,
        immediately
      );

      res.json({
        message: immediately
          ? 'Subscription canceled immediately'
          : 'Subscription will be canceled at the end of the billing period',
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: subscription.current_period_end,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivateSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeSubscriptionId: true },
      });

      if (!user?.stripeSubscriptionId) {
        res.status(400).json({ error: 'No subscription found' });
        return;
      }

      const subscription = await stripeService.reactivateSubscription(user.stripeSubscriptionId);

      res.json({
        message: 'Subscription reactivated successfully',
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invoices
   */
  async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        res.json({ invoices: [] });
        return;
      }

      const invoices = await stripeService.listInvoices(user.stripeCustomerId);

      res.json({
        invoices: invoices.map((inv) => ({
          id: inv.id,
          amountDue: inv.amount_due,
          amountPaid: inv.amount_paid,
          status: inv.status,
          invoiceUrl: inv.hosted_invoice_url,
          pdfUrl: inv.invoice_pdf,
          dueDate: inv.due_date,
          created: inv.created,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get usage stats
   */
  async getUsageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const limits = await getSubscriptionLimits(userId);

      res.json({ usage: limits });
    } catch (error) {
      next(error);
    }
  }
}
