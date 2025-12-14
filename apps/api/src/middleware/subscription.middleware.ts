import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tier limits configuration
const TIER_LIMITS: Record<string, {
  maxFlashcardSets: number | null;
  maxQuizzes: number | null;
  maxUploads: number | null;
  maxCourses: number | null;
}> = {
  FREE: {
    maxFlashcardSets: 3,
    maxQuizzes: 5,
    maxUploads: 5,
    maxCourses: 1,
  },
  PREMIUM: {
    maxFlashcardSets: null, // Unlimited
    maxQuizzes: null,
    maxUploads: null,
    maxCourses: null,
  },
  STUDENT_PLUS: {
    maxFlashcardSets: null,
    maxQuizzes: null,
    maxUploads: null,
    maxCourses: null,
  },
  UNIVERSITY: {
    maxFlashcardSets: null,
    maxQuizzes: null,
    maxUploads: null,
    maxCourses: null,
  },
};

/**
 * Middleware to check if user has reached their flashcard set limit
 */
export const checkFlashcardSetLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const tier = req.user.subscriptionTier || 'FREE';
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.FREE;

    // If unlimited, continue
    if (limits.maxFlashcardSets === null) {
      next();
      return;
    }

    // Count current flashcard sets
    const count = await prisma.flashcardSet.count({
      where: { userId: req.user.userId },
    });

    if (count >= limits.maxFlashcardSets) {
      res.status(403).json({
        error: 'You have reached your flashcard set limit',
        limit: limits.maxFlashcardSets,
        current: count,
        currentTier: tier,
        upgradeUrl: '/pricing',
        message: `Upgrade to Premium for unlimited flashcard sets`,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking flashcard set limit:', error);
    next(error);
  }
};

/**
 * Middleware to check if user has reached their quiz limit
 */
export const checkQuizLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const tier = req.user.subscriptionTier || 'FREE';
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.FREE;

    // If unlimited, continue
    if (limits.maxQuizzes === null) {
      next();
      return;
    }

    // Count current quizzes
    const count = await prisma.quiz.count({
      where: { userId: req.user.userId },
    });

    if (count >= limits.maxQuizzes) {
      res.status(403).json({
        error: 'You have reached your quiz limit',
        limit: limits.maxQuizzes,
        current: count,
        currentTier: tier,
        upgradeUrl: '/pricing',
        message: `Upgrade to Premium for unlimited quizzes`,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking quiz limit:', error);
    next(error);
  }
};

/**
 * Middleware to check if user has reached their upload limit
 */
export const checkUploadLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const tier = req.user.subscriptionTier || 'FREE';
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.FREE;

    // If unlimited, continue
    if (limits.maxUploads === null) {
      next();
      return;
    }

    // Count current uploads
    const count = await prisma.upload.count({
      where: { userId: req.user.userId },
    });

    if (count >= limits.maxUploads) {
      res.status(403).json({
        error: 'You have reached your upload limit',
        limit: limits.maxUploads,
        current: count,
        currentTier: tier,
        upgradeUrl: '/pricing',
        message: `Upgrade to Premium for unlimited uploads`,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking upload limit:', error);
    next(error);
  }
};

/**
 * Get current usage for a user
 */
export const getUserUsage = async (userId: string) => {
  const [flashcardSets, quizzes, uploads] = await Promise.all([
    prisma.flashcardSet.count({ where: { userId } }),
    prisma.quiz.count({ where: { userId } }),
    prisma.upload.count({ where: { userId } }),
  ]);

  return {
    flashcardSets,
    quizzes,
    uploads,
  };
};

/**
 * Get limits for a tier
 */
export const getTierLimits = (tier: string) => {
  return TIER_LIMITS[tier] || TIER_LIMITS.FREE;
};
