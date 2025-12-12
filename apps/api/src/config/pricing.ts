/**
 * Pricing Configuration
 * Defines subscription tiers, pricing, and feature limits
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'FREE' | 'PREMIUM' | 'STUDENT_PLUS' | 'UNIVERSITY';
  description: string;
  monthlyPrice: number; // in USD
  yearlyPrice: number; // in USD (with discount)
  stripePriceIdMonthly?: string; // Stripe price ID for monthly billing
  stripePriceIdYearly?: string; // Stripe price ID for yearly billing
  trialDays?: number;
  features: {
    maxCourses: number | null; // null = unlimited
    maxFlashcardSets: number | null;
    maxQuizzes: number | null;
    aiFlashcards: boolean;
    aiQuizzes: boolean;
    knowledgeGraph: boolean;
    examPrediction: boolean;
    analytics: boolean;
    assignmentHelp: boolean;
    prioritySupport: boolean;
    mobileApp: boolean;
    exportData: boolean;
  };
}

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  FREE: {
    id: 'free',
    name: 'Free',
    tier: 'FREE',
    description: 'Perfect for trying out StudySync',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: {
      maxCourses: 1,
      maxFlashcardSets: 3,
      maxQuizzes: 5,
      aiFlashcards: true,
      aiQuizzes: true,
      knowledgeGraph: false,
      examPrediction: false,
      analytics: false,
      assignmentHelp: false,
      prioritySupport: false,
      mobileApp: true,
      exportData: false,
    },
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    tier: 'PREMIUM',
    description: 'Unlimited courses and advanced features',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99, // 2 months free
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
    features: {
      maxCourses: null,
      maxFlashcardSets: null,
      maxQuizzes: null,
      aiFlashcards: true,
      aiQuizzes: true,
      knowledgeGraph: true,
      examPrediction: false,
      analytics: true,
      assignmentHelp: false,
      prioritySupport: true,
      mobileApp: true,
      exportData: true,
    },
  },
  STUDENT_PLUS: {
    id: 'student_plus',
    name: 'Student Plus',
    tier: 'STUDENT_PLUS',
    description: 'All Premium features plus AI tutoring and exam prediction',
    monthlyPrice: 14.99,
    yearlyPrice: 149.99, // 2 months free
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STUDENT_PLUS_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_STUDENT_PLUS_YEARLY,
    trialDays: 7,
    features: {
      maxCourses: null,
      maxFlashcardSets: null,
      maxQuizzes: null,
      aiFlashcards: true,
      aiQuizzes: true,
      knowledgeGraph: true,
      examPrediction: true,
      analytics: true,
      assignmentHelp: true,
      prioritySupport: true,
      mobileApp: true,
      exportData: true,
    },
  },
};

/**
 * Get plan by tier
 */
export function getPlanByTier(tier: string): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS[tier] || null;
}

/**
 * Get plan by Stripe price ID
 */
export function getPlanByPriceId(priceId: string): SubscriptionPlan | null {
  for (const plan of Object.values(SUBSCRIPTION_PLANS)) {
    if (plan.stripePriceIdMonthly === priceId || plan.stripePriceIdYearly === priceId) {
      return plan;
    }
  }
  return null;
}

/**
 * Check if feature is available for tier
 */
export function hasFeature(
  tier: string,
  feature: keyof SubscriptionPlan['features']
): boolean {
  const plan = getPlanByTier(tier);
  return plan ? plan.features[feature] as boolean : false;
}

/**
 * Get feature limit for tier
 */
export function getFeatureLimit(
  tier: string,
  feature: 'maxCourses' | 'maxFlashcardSets' | 'maxQuizzes'
): number | null {
  const plan = getPlanByTier(tier);
  return plan ? plan.features[feature] : 0;
}

/**
 * Check if user can access feature
 */
export function canAccessFeature(
  tier: string,
  feature: keyof SubscriptionPlan['features']
): boolean {
  return hasFeature(tier, feature);
}

/**
 * Get all available plans for display
 */
export function getAllPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS);
}

/**
 * Calculate annual savings
 */
export function getAnnualSavings(tier: string): number {
  const plan = getPlanByTier(tier);
  if (!plan) return 0;
  const monthlyTotal = plan.monthlyPrice * 12;
  return monthlyTotal - plan.yearlyPrice;
}

/**
 * Calculate annual savings percentage
 */
export function getAnnualSavingsPercentage(tier: string): number {
  const plan = getPlanByTier(tier);
  if (!plan || plan.monthlyPrice === 0) return 0;
  const savings = getAnnualSavings(tier);
  return Math.round((savings / (plan.monthlyPrice * 12)) * 100);
}

/**
 * Student discount configuration (.edu emails)
 */
export const STUDENT_DISCOUNT_PERCENTAGE = 20; // 20% off for students

/**
 * Apply student discount to price
 */
export function applyStudentDiscount(price: number): number {
  return price * (1 - STUDENT_DISCOUNT_PERCENTAGE / 100);
}
