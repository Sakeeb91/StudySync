// Subscription API client for StudySync

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Helper for authenticated requests
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }

  return data;
}

// ============================================
// TYPES
// ============================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: {
    courses: number | null;
    flashcardSets: number | null;
    quizzes: number | null;
    uploads: number | null;
  };
  popular?: boolean;
  trialDays?: number;
}

export interface SubscriptionResponse {
  tier: string;
  status: string;
  isActive: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  plan: SubscriptionPlan | null;
}

export interface UsageResponse {
  flashcardSets: { used: number; limit: number | null };
  quizzes: { used: number; limit: number | null };
  courses: { used: number; limit: number | null };
  uploads: { used: number; limit: number | null };
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface Invoice {
  id: string;
  stripeInvoiceId: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  invoiceUrl: string | null;
  pdfUrl: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all available subscription plans
 */
export async function getSubscriptionPlans(): Promise<{ plans: SubscriptionPlan[] }> {
  return fetchApi('/subscriptions/plans');
}

/**
 * Get current user's subscription status
 */
export async function getCurrentSubscription(): Promise<SubscriptionResponse> {
  return fetchApi('/subscriptions/current');
}

/**
 * Get current user's usage statistics
 */
export async function getSubscriptionUsage(): Promise<UsageResponse> {
  return fetchApi('/subscriptions/usage');
}

/**
 * Create a checkout session for a subscription
 */
export interface CreateCheckoutParams {
  priceId: string;
  billingPeriod: 'monthly' | 'yearly';
  successUrl?: string;
  cancelUrl?: string;
  promoCode?: string;
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResponse> {
  return fetchApi('/subscriptions/checkout', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Create a billing portal session for subscription management
 */
export async function createPortalSession(returnUrl?: string): Promise<PortalSessionResponse> {
  return fetchApi('/subscriptions/portal', {
    method: 'POST',
    body: JSON.stringify({ returnUrl }),
  });
}

/**
 * Cancel the current subscription
 */
export interface CancelSubscriptionParams {
  immediately?: boolean;
  reason?: string;
}

export async function cancelSubscription(params: CancelSubscriptionParams = {}): Promise<{ message: string }> {
  return fetchApi('/subscriptions/cancel', {
    method: 'PUT',
    body: JSON.stringify(params),
  });
}

/**
 * Reactivate a canceled subscription (before period end)
 */
export async function reactivateSubscription(): Promise<{ message: string }> {
  return fetchApi('/subscriptions/reactivate', {
    method: 'PUT',
  });
}

/**
 * Get invoice history
 */
export async function getInvoices(limit?: number): Promise<{ invoices: Invoice[] }> {
  const query = limit ? `?limit=${limit}` : '';
  return fetchApi(`/subscriptions/invoices${query}`);
}

/**
 * Apply a promo/discount code
 */
export async function applyPromoCode(code: string): Promise<{ valid: boolean; discount?: number; message: string }> {
  return fetchApi('/subscriptions/promo', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format price for display
 */
export function formatPrice(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/**
 * Calculate annual savings
 */
export function calculateAnnualSavings(monthlyPrice: number, yearlyPrice: number): number {
  const annualFromMonthly = monthlyPrice * 12;
  return annualFromMonthly - yearlyPrice;
}

/**
 * Calculate annual savings percentage
 */
export function calculateSavingsPercentage(monthlyPrice: number, yearlyPrice: number): number {
  const annualFromMonthly = monthlyPrice * 12;
  const savings = annualFromMonthly - yearlyPrice;
  return Math.round((savings / annualFromMonthly) * 100);
}

/**
 * Check if user has reached a usage limit
 */
export function hasReachedLimit(used: number, limit: number | null): boolean {
  if (limit === null) return false; // No limit
  return used >= limit;
}

/**
 * Get usage percentage
 */
export function getUsagePercentage(used: number, limit: number | null): number {
  if (limit === null || limit === 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}
