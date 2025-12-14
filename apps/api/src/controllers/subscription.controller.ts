import { Request, Response, NextFunction } from 'express';
import { stripeService } from '../services/stripe.service';
import { PrismaClient } from '@prisma/client';
import { getAllPlans, getPlanByTier } from '../config/pricing';
import {
  getSubscriptionStatus,
  getSubscriptionLimits,
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

      // Check if user has a .edu email for automatic student discount
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      const isStudentEmail = user?.email?.toLowerCase().endsWith('.edu');

      // Create checkout session
      // Note: allow_promotion_codes is enabled in the session, so users can enter promo codes at checkout
      const session = await stripeService.createCheckoutSession(
        customer.id,
        priceId,
        {
          successUrl: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${process.env.FRONTEND_URL}/checkout/cancel`,
          trialPeriodDays: billingPeriod === 'monthly' ? undefined : 7, // 7-day trial for yearly plans
          metadata: {
            userId,
            billingPeriod,
            isStudentEmail: isStudentEmail ? 'true' : 'false',
          },
        }
      );

      res.json({
        sessionId: session.id,
        url: session.url,
        studentDiscountApplied: isStudentEmail,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate a promo code
   */
  async validatePromoCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.body;

      if (!code) {
        res.status(400).json({ error: 'Promo code is required' });
        return;
      }

      // For now, check for known promo codes
      const validCodes: Record<string, { discount: number; description: string }> = {
        STUDENT20: { discount: 20, description: '20% student discount' },
        LAUNCH10: { discount: 10, description: '10% launch discount' },
        ANNUAL25: { discount: 25, description: '25% annual plan discount' },
      };

      const promo = validCodes[code.toUpperCase()];

      if (promo) {
        res.json({
          valid: true,
          discount: promo.discount,
          message: promo.description,
        });
      } else {
        res.json({
          valid: false,
          message: 'Invalid promo code',
        });
      }
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

      // Cast to access period end property
      const sub = subscription as typeof subscription & { current_period_end?: number };

      res.json({
        message: immediately
          ? 'Subscription canceled immediately'
          : 'Subscription will be canceled at the end of the billing period',
        subscription: {
          id: sub.id,
          status: sub.status,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodEnd: sub.current_period_end,
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
