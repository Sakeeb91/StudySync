import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../config/stripe';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class WebhookController {
  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      return;
    }

    console.log(`✨ Received webhook event: ${event.type}`);

    try {
      // Handle the event
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.created':
        case 'customer.updated':
          await this.handleCustomerUpdate(event.data.object as Stripe.Customer);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }

  /**
   * Handle subscription creation/update
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    console.log(`Processing subscription update: ${subscription.id}`);

    // Cast subscription to access properties (Stripe SDK type changes)
    const sub = subscription as Stripe.Subscription & {
      current_period_end: number;
    };

    // The stripeService.saveSubscriptionToDatabase() method handles all the logic
    // It's called automatically in subscription operations, but we can call it here too
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: sub.customer as string },
    });

    if (!user) {
      console.warn(`User not found for customer ${sub.customer}`);
      return;
    }

    // Update user's subscription status
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      unpaid: SubscriptionStatus.PAST_DUE,
      trialing: SubscriptionStatus.TRIALING,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
    };

    const subscriptionStatus = statusMap[sub.status] || SubscriptionStatus.INACTIVE;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionId: sub.id,
        subscriptionStatus,
        subscriptionEnd: new Date(sub.current_period_end * 1000),
        trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      },
    });

    console.log(`✅ Updated subscription ${sub.id} for user ${user.id}`);
  }

  /**
   * Handle subscription deletion
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log(`Processing subscription deletion: ${subscription.id}`);

    const user = await prisma.user.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!user) {
      console.warn(`User not found for subscription ${subscription.id}`);
      return;
    }

    // Revert to FREE tier
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: 'FREE',
        subscriptionStatus: 'INACTIVE',
        stripeSubscriptionId: null,
        subscriptionEnd: null,
        trialEndsAt: null,
      },
    });

    console.log(`✅ Reverted user ${user.id} to FREE tier`);
  }

  /**
   * Handle successful invoice payment
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    console.log(`Processing paid invoice: ${invoice.id}`);

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (!user) return;

    // Cast invoice to access subscription property
    const inv = invoice as Stripe.Invoice & { subscription?: string };

    // Save invoice to database
    await prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        userId: user.id,
        stripeInvoiceId: invoice.id,
        subscriptionId: inv.subscription || undefined,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        status: 'PAID',
        invoiceUrl: invoice.hosted_invoice_url || undefined,
        pdfUrl: invoice.invoice_pdf || undefined,
        paidAt: new Date(),
      },
      update: {
        amountPaid: invoice.amount_paid,
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    console.log(`✅ Saved paid invoice ${invoice.id}`);
  }

  /**
   * Handle failed invoice payment
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log(`Processing failed invoice payment: ${invoice.id}`);

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (!user) return;

    // Update user status to PAST_DUE
    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: 'PAST_DUE' },
    });

    // TODO: Send email notification to user about failed payment

    console.log(`✅ Marked user ${user.id} as PAST_DUE`);
  }

  /**
   * Handle customer updates
   */
  private async handleCustomerUpdate(customer: Stripe.Customer): Promise<void> {
    console.log(`Processing customer update: ${customer.id}`);

    await prisma.user.updateMany({
      where: { stripeCustomerId: customer.id },
      data: {
        email: customer.email || undefined,
        name: customer.name || undefined,
      },
    });
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`Processing successful payment: ${paymentIntent.id}`);

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: paymentIntent.customer as string },
    });

    if (!user) return;

    // Save payment to database
    await prisma.payment.create({
      data: {
        userId: user.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'SUCCEEDED',
        description: paymentIntent.description || undefined,
        metadata: paymentIntent.metadata as any,
      },
    });

    console.log(`✅ Saved successful payment ${paymentIntent.id}`);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`Processing failed payment: ${paymentIntent.id}`);

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: paymentIntent.customer as string },
    });

    if (!user) return;

    // Save failed payment to database
    await prisma.payment.create({
      data: {
        userId: user.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'FAILED',
        description: paymentIntent.description || undefined,
        metadata: paymentIntent.metadata as any,
      },
    });

    console.log(`✅ Saved failed payment ${paymentIntent.id}`);
  }
}
