import { stripe } from '../config/stripe';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

/**
 * Stripe Service - Customer Operations
 * Handles customer creation, updates, and management in Stripe
 */
export class StripeService {
  /**
   * Create a new Stripe customer
   * @param userId - User ID from our database
   * @param email - Customer email
   * @param name - Customer name
   * @param metadata - Additional metadata
   * @returns Stripe customer object
   */
  async createCustomer(
    userId: string,
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email,
        name: name || undefined,
        metadata: {
          userId,
          ...metadata,
        },
      });

      // Update user in database with Stripe customer ID
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customer.id },
      });

      console.log(`✅ Created Stripe customer ${customer.id} for user ${userId}`);
      return customer;
    } catch (error) {
      console.error('Failed to create Stripe customer:', error);
      throw new Error('Failed to create customer in Stripe');
    }
  }

  /**
   * Get existing Stripe customer or create new one
   * @param userId - User ID from our database
   * @returns Stripe customer object
   */
  async getOrCreateCustomer(userId: string): Promise<Stripe.Customer> {
    try {
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          stripeCustomerId: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // If user already has a Stripe customer ID, retrieve it
      if (user.stripeCustomerId) {
        try {
          const customer = await stripe.customers.retrieve(user.stripeCustomerId);
          if (!customer.deleted) {
            return customer as Stripe.Customer;
          }
        } catch (error) {
          console.warn(`Stripe customer ${user.stripeCustomerId} not found, creating new one`);
        }
      }

      // Create new customer if none exists
      return await this.createCustomer(userId, user.email, user.name || undefined);
    } catch (error) {
      console.error('Failed to get or create customer:', error);
      throw new Error('Failed to get or create Stripe customer');
    }
  }

  /**
   * Update Stripe customer information
   * @param customerId - Stripe customer ID
   * @param updates - Customer update data
   * @returns Updated Stripe customer object
   */
  async updateCustomer(
    customerId: string,
    updates: {
      email?: string;
      name?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.update(customerId, updates);
      console.log(`✅ Updated Stripe customer ${customerId}`);
      return customer;
    } catch (error) {
      console.error('Failed to update Stripe customer:', error);
      throw new Error('Failed to update customer in Stripe');
    }
  }

  /**
   * Delete (archive) a Stripe customer
   * Note: Stripe doesn't actually delete customers, it archives them
   * @param customerId - Stripe customer ID
   * @returns Deleted customer object
   */
  async deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
    try {
      const deletedCustomer = await stripe.customers.del(customerId);

      // Remove Stripe customer ID from user in database
      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          subscriptionStatus: 'INACTIVE',
          subscriptionTier: 'FREE',
        },
      });

      console.log(`✅ Deleted Stripe customer ${customerId}`);
      return deletedCustomer;
    } catch (error) {
      console.error('Failed to delete Stripe customer:', error);
      throw new Error('Failed to delete customer in Stripe');
    }
  }

  /**
   * Get customer by ID
   * @param customerId - Stripe customer ID
   * @returns Stripe customer object
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        throw new Error('Customer has been deleted');
      }
      return customer as Stripe.Customer;
    } catch (error) {
      console.error('Failed to retrieve Stripe customer:', error);
      throw new Error('Failed to retrieve customer from Stripe');
    }
  }

  /**
   * List all payment methods for a customer
   * @param customerId - Stripe customer ID
   * @returns List of payment methods
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return paymentMethods.data;
    } catch (error) {
      console.error('Failed to list payment methods:', error);
      throw new Error('Failed to list payment methods');
    }
  }

  /**
   * Attach a payment method to a customer
   * @param paymentMethodId - Payment method ID
   * @param customerId - Stripe customer ID
   * @returns Attached payment method
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      console.log(`✅ Attached payment method ${paymentMethodId} to customer ${customerId}`);
      return paymentMethod;
    } catch (error) {
      console.error('Failed to attach payment method:', error);
      throw new Error('Failed to attach payment method');
    }
  }

  /**
   * Detach a payment method from a customer
   * @param paymentMethodId - Payment method ID
   * @returns Detached payment method
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
      console.log(`✅ Detached payment method ${paymentMethodId}`);
      return paymentMethod;
    } catch (error) {
      console.error('Failed to detach payment method:', error);
      throw new Error('Failed to detach payment method');
    }
  }

  // ============================================================================
  // SUBSCRIPTION OPERATIONS
  // ============================================================================

  /**
   * Create a new subscription for a customer
   * @param customerId - Stripe customer ID
   * @param priceId - Stripe price ID
   * @param options - Additional subscription options
   * @returns Stripe subscription object
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    options?: {
      trialPeriodDays?: number;
      metadata?: Record<string, string>;
      promotionCode?: string;
    }
  ): Promise<Stripe.Subscription> {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: options?.metadata,
      };

      if (options?.trialPeriodDays) {
        subscriptionData.trial_period_days = options.trialPeriodDays;
      }

      if (options?.promotionCode) {
        // Use discounts array for promotion codes
        subscriptionData.discounts = [{ promotion_code: options.promotionCode }];
      }

      const subscription = await stripe.subscriptions.create(subscriptionData);

      // Save subscription to database
      await this.saveSubscriptionToDatabase(subscription);

      console.log(`✅ Created subscription ${subscription.id} for customer ${customerId}`);
      return subscription;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  /**
   * Update an existing subscription
   * @param subscriptionId - Stripe subscription ID
   * @param updates - Subscription update data
   * @returns Updated subscription object
   */
  async updateSubscription(
    subscriptionId: string,
    updates: {
      priceId?: string;
      metadata?: Record<string, string>;
      cancelAtPeriodEnd?: boolean;
    }
  ): Promise<Stripe.Subscription> {
    try {
      const updateData: Stripe.SubscriptionUpdateParams = {};

      if (updates.priceId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        updateData.items = [
          {
            id: subscription.items.data[0].id,
            price: updates.priceId,
          },
        ];
        updateData.proration_behavior = 'create_prorations'; // Prorate on upgrade/downgrade
      }

      if (updates.metadata) {
        updateData.metadata = updates.metadata;
      }

      if (updates.cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = updates.cancelAtPeriodEnd;
      }

      const subscription = await stripe.subscriptions.update(subscriptionId, updateData);

      // Update subscription in database
      await this.saveSubscriptionToDatabase(subscription);

      console.log(`✅ Updated subscription ${subscriptionId}`);
      return subscription;
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  /**
   * Cancel a subscription
   * @param subscriptionId - Stripe subscription ID
   * @param immediately - Cancel immediately or at period end
   * @returns Canceled subscription object
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<Stripe.Subscription> {
    try {
      let subscription: Stripe.Subscription;

      if (immediately) {
        subscription = await stripe.subscriptions.cancel(subscriptionId);
      } else {
        subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }

      // Update subscription in database
      await this.saveSubscriptionToDatabase(subscription);

      console.log(`✅ Canceled subscription ${subscriptionId} (immediate: ${immediately})`);
      return subscription;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Reactivate a canceled subscription
   * @param subscriptionId - Stripe subscription ID
   * @returns Reactivated subscription object
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      // Update subscription in database
      await this.saveSubscriptionToDatabase(subscription);

      console.log(`✅ Reactivated subscription ${subscriptionId}`);
      return subscription;
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      throw new Error('Failed to reactivate subscription');
    }
  }

  /**
   * Get subscription by ID
   * @param subscriptionId - Stripe subscription ID
   * @returns Stripe subscription object
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Failed to retrieve subscription:', error);
      throw new Error('Failed to retrieve subscription');
    }
  }

  /**
   * List all subscriptions for a customer
   * @param customerId - Stripe customer ID
   * @returns List of subscriptions
   */
  async listSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.default_payment_method'],
      });
      return subscriptions.data;
    } catch (error) {
      console.error('Failed to list subscriptions:', error);
      throw new Error('Failed to list subscriptions');
    }
  }

  /**
   * Save subscription to database
   * @param subscription - Stripe subscription object
   */
  private async saveSubscriptionToDatabase(subscription: Stripe.Subscription): Promise<void> {
    try {
      // Cast subscription to access properties (Stripe SDK type changes)
      const sub = subscription as Stripe.Subscription & {
        current_period_start: number;
        current_period_end: number;
      };

      // Get user from customer ID
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: sub.customer as string },
      });

      if (!user) {
        console.warn(`User not found for customer ${sub.customer}`);
        return;
      }

      // Map Stripe subscription status to our enum
      const statusMap: Record<string, string> = {
        active: 'ACTIVE',
        past_due: 'PAST_DUE',
        canceled: 'CANCELED',
        unpaid: 'PAST_DUE',
        trialing: 'TRIALING',
        incomplete: 'INCOMPLETE',
        incomplete_expired: 'INCOMPLETE_EXPIRED',
      };

      const subscriptionStatus = statusMap[sub.status] || 'INACTIVE';

      // Determine subscription tier from price ID
      const priceId = sub.items.data[0].price.id;
      let subscriptionTier: 'FREE' | 'PREMIUM' | 'STUDENT_PLUS' | 'UNIVERSITY' = 'FREE';

      // This will be replaced by actual price IDs from pricing config
      if (priceId.includes('premium')) {
        subscriptionTier = 'PREMIUM';
      } else if (priceId.includes('student_plus') || priceId.includes('plus')) {
        subscriptionTier = 'STUDENT_PLUS';
      } else if (priceId.includes('university')) {
        subscriptionTier = 'UNIVERSITY';
      }

      // Upsert subscription in database
      await prisma.subscription.upsert({
        where: { stripeSubscriptionId: sub.id },
        create: {
          userId: user.id,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          status: subscriptionStatus,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
          trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : null,
          trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        },
        update: {
          status: subscriptionStatus,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
          stripePriceId: priceId,
        },
      });

      // Update user subscription info
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeSubscriptionId: sub.id,
          subscriptionStatus,
          subscriptionTier,
          subscriptionEnd: new Date(sub.current_period_end * 1000),
          trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        },
      });

      console.log(`✅ Saved subscription ${subscription.id} to database`);
    } catch (error) {
      console.error('Failed to save subscription to database:', error);
      // Don't throw error - webhook will retry
    }
  }

  // ============================================================================
  // PAYMENT OPERATIONS
  // ============================================================================

  /**
   * Create a checkout session for subscription
   * @param customerId - Stripe customer ID
   * @param priceId - Stripe price ID
   * @param options - Checkout session options
   * @returns Stripe checkout session
   */
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    options: {
      successUrl: string;
      cancelUrl: string;
      trialPeriodDays?: number;
      metadata?: Record<string, string>;
    }
  ): Promise<Stripe.Checkout.Session> {
    try {
      const sessionData: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        metadata: options.metadata,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        payment_method_types: ['card'],
      };

      if (options.trialPeriodDays) {
        sessionData.subscription_data = {
          trial_period_days: options.trialPeriodDays,
        };
      }

      const session = await stripe.checkout.sessions.create(sessionData);
      console.log(`✅ Created checkout session ${session.id}`);
      return session;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Create billing portal session
   * @param customerId - Stripe customer ID
   * @param returnUrl - Return URL after portal session
   * @returns Stripe billing portal session
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      console.log(`✅ Created billing portal session for customer ${customerId}`);
      return session;
    } catch (error) {
      console.error('Failed to create billing portal session:', error);
      throw new Error('Failed to create billing portal session');
    }
  }

  /**
   * Create payment intent for one-time payments
   * @param amount - Amount in cents
   * @param customerId - Stripe customer ID
   * @param options - Payment intent options
   * @returns Stripe payment intent
   */
  async createPaymentIntent(
    amount: number,
    customerId: string,
    options?: {
      currency?: string;
      description?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: options?.currency || 'usd',
        customer: customerId,
        description: options?.description,
        metadata: options?.metadata,
        automatic_payment_methods: { enabled: true },
      });

      console.log(`✅ Created payment intent ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * List invoices for a customer
   * @param customerId - Stripe customer ID
   * @param limit - Number of invoices to retrieve
   * @returns List of invoices
   */
  async listInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
      });
      return invoices.data;
    } catch (error) {
      console.error('Failed to list invoices:', error);
      throw new Error('Failed to list invoices');
    }
  }

  /**
   * Get upcoming invoice for a subscription
   * @param subscriptionId - Stripe subscription ID
   * @returns Upcoming invoice
   */
  async getUpcomingInvoice(subscriptionId: string): Promise<Stripe.UpcomingInvoice> {
    try {
      const invoice = await stripe.invoices.createPreview({
        subscription: subscriptionId,
      });
      return invoice;
    } catch (error) {
      console.error('Failed to retrieve upcoming invoice:', error);
      throw new Error('Failed to retrieve upcoming invoice');
    }
  }
}

export const stripeService = new StripeService();
