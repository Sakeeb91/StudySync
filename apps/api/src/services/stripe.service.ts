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
}

export const stripeService = new StripeService();
