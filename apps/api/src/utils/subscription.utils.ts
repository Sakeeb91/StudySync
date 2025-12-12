import { PrismaClient, SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { getPlanByTier, getFeatureLimit, hasFeature } from '../config/pricing';

const prisma = new PrismaClient();

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true, subscriptionEnd: true },
    });

    if (!user) return false;

    // Check if status is active and not expired
    const isActive = user.subscriptionStatus === SubscriptionStatus.ACTIVE ||
                     user.subscriptionStatus === SubscriptionStatus.TRIALING;

    if (!isActive) return false;

    // Check if subscription has ended
    if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking active subscription:', error);
    return false;
  }
}

/**
 * Check if user can access a specific feature
 */
export async function canAccessFeature(
  userId: string,
  feature: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, subscriptionStatus: true },
    });

    if (!user) return false;

    // FREE tier users need to have specific features enabled
    if (user.subscriptionTier === SubscriptionTier.FREE) {
      return hasFeature('FREE', feature as any);
    }

    // Check if subscription is active
    const isActive = await hasActiveSubscription(userId);
    if (!isActive) {
      // Subscription expired, fall back to FREE tier
      return hasFeature('FREE', feature as any);
    }

    return hasFeature(user.subscriptionTier, feature as any);
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
}

/**
 * Get user's current subscription limits
 */
export async function getSubscriptionLimits(userId: string): Promise<{
  maxCourses: number | null;
  maxFlashcardSets: number | null;
  maxQuizzes: number | null;
  currentCourses: number;
  currentFlashcardSets: number;
  currentQuizzes: number;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        flashcardSets: true,
        quizzes: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Determine effective tier (FREE if subscription expired)
    let effectiveTier = user.subscriptionTier;
    const isActive = await hasActiveSubscription(userId);
    if (!isActive && effectiveTier !== SubscriptionTier.FREE) {
      effectiveTier = SubscriptionTier.FREE;
    }

    const maxCourses = getFeatureLimit(effectiveTier, 'maxCourses');
    const maxFlashcardSets = getFeatureLimit(effectiveTier, 'maxFlashcardSets');
    const maxQuizzes = getFeatureLimit(effectiveTier, 'maxQuizzes');

    // Count current usage
    const currentFlashcardSets = user.flashcardSets.length;
    const currentQuizzes = user.quizzes.length;

    // For courses, we need to count unique uploads (simplified)
    const currentCourses = 0; // TODO: Implement course counting logic

    return {
      maxCourses,
      maxFlashcardSets,
      maxQuizzes,
      currentCourses,
      currentFlashcardSets,
      currentQuizzes,
    };
  } catch (error) {
    console.error('Error getting subscription limits:', error);
    throw error;
  }
}

/**
 * Check if user has reached a specific limit
 */
export async function hasReachedLimit(
  userId: string,
  limitType: 'courses' | 'flashcardSets' | 'quizzes'
): Promise<boolean> {
  try {
    const limits = await getSubscriptionLimits(userId);

    switch (limitType) {
      case 'courses':
        return limits.maxCourses !== null && limits.currentCourses >= limits.maxCourses;
      case 'flashcardSets':
        return limits.maxFlashcardSets !== null && limits.currentFlashcardSets >= limits.maxFlashcardSets;
      case 'quizzes':
        return limits.maxQuizzes !== null && limits.currentQuizzes >= limits.maxQuizzes;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking limit:', error);
    return false;
  }
}

/**
 * Get user's subscription status for display
 */
export async function getSubscriptionStatus(userId: string): Promise<{
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isActive: boolean;
  daysUntilRenewal: number | null;
  cancelAtPeriodEnd: boolean;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionEnd: true,
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isActive = await hasActiveSubscription(userId);
    const currentSubscription = user.subscriptions[0];

    let daysUntilRenewal: number | null = null;
    if (user.subscriptionEnd) {
      const now = new Date();
      const end = new Date(user.subscriptionEnd);
      daysUntilRenewal = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      isActive,
      daysUntilRenewal,
      cancelAtPeriodEnd: currentSubscription?.cancelAtPeriodEnd || false,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    throw error;
  }
}

/**
 * Check if user is on trial
 */
export async function isOnTrial(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true, trialEndsAt: true },
    });

    if (!user) return false;

    if (user.subscriptionStatus !== SubscriptionStatus.TRIALING) {
      return false;
    }

    if (user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking trial status:', error);
    return false;
  }
}

/**
 * Get days remaining in trial
 */
export async function getTrialDaysRemaining(userId: string): Promise<number | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { trialEndsAt: true },
    });

    if (!user || !user.trialEndsAt) return null;

    const now = new Date();
    const trialEnd = new Date(user.trialEndsAt);
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return daysRemaining > 0 ? daysRemaining : 0;
  } catch (error) {
    console.error('Error getting trial days:', error);
    return null;
  }
}

/**
 * Check if user's email is a student email (.edu)
 */
export function isStudentEmail(email: string): boolean {
  return email.toLowerCase().endsWith('.edu');
}

/**
 * Validate subscription tier upgrade/downgrade
 */
export function canChangeTier(
  currentTier: SubscriptionTier,
  newTier: SubscriptionTier
): { allowed: boolean; reason?: string } {
  // Can't "upgrade" to FREE
  if (newTier === SubscriptionTier.FREE) {
    return { allowed: false, reason: 'Cannot downgrade to free tier. Please cancel subscription instead.' };
  }

  // Already on this tier
  if (currentTier === newTier) {
    return { allowed: false, reason: 'Already subscribed to this tier.' };
  }

  // All other changes are allowed
  return { allowed: true };
}
