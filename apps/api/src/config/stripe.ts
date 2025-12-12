import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

// Initialize Stripe with the secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia', // Use the latest API version
  typescript: true,
  appInfo: {
    name: 'StudySync',
    version: '0.1.0',
    url: 'https://studysync.ai',
  },
});

// Stripe webhook secret for signature verification
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Test mode check
export const isStripeTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');

console.log(`🔐 Stripe initialized in ${isStripeTestMode ? 'TEST' : 'LIVE'} mode`);
