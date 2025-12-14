import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '@studysync/auth';

// Extend Express Request type to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: JWTPayload;
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
};

export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch {
      // Token invalid, but continue without user
    }
  }

  next();
};

export const requireSubscription = (tiers: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!tiers.includes(req.user.subscriptionTier)) {
      res.status(403).json({
        error: 'This feature requires a premium subscription',
        requiredTiers: tiers,
        currentTier: req.user.subscriptionTier,
        upgradeUrl: '/pricing',
      });
      return;
    }

    next();
  };
};

// New middleware: Require active subscription
// Note: This checks the subscription tier from JWT payload
// For more granular status checks, use database lookup
export const requireActiveSubscription = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check if user has a paid tier (subscription status is tracked in database)
    const tier = req.user.subscriptionTier || 'FREE';

    if (tier === 'FREE') {
      res.status(403).json({
        error: 'This feature requires an active subscription',
        currentTier: tier,
        upgradeUrl: '/pricing',
      });
      return;
    }

    next();
  };
};

// Feature access middleware
export const requireFeature = (feature: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const tier = req.user.subscriptionTier || 'FREE';

    // Define which features are available per tier
    const tierFeatures: Record<string, string[]> = {
      FREE: ['basic_flashcards', 'basic_quizzes', 'basic_uploads'],
      PREMIUM: [
        'basic_flashcards', 'basic_quizzes', 'basic_uploads',
        'unlimited_flashcards', 'unlimited_quizzes', 'unlimited_uploads',
        'knowledge_graph', 'analytics', 'advanced_ai',
      ],
      STUDENT_PLUS: [
        'basic_flashcards', 'basic_quizzes', 'basic_uploads',
        'unlimited_flashcards', 'unlimited_quizzes', 'unlimited_uploads',
        'knowledge_graph', 'analytics', 'advanced_ai',
        'exam_prediction', 'assignment_help', 'ai_tutoring',
      ],
      UNIVERSITY: [
        'basic_flashcards', 'basic_quizzes', 'basic_uploads',
        'unlimited_flashcards', 'unlimited_quizzes', 'unlimited_uploads',
        'knowledge_graph', 'analytics', 'advanced_ai',
        'exam_prediction', 'assignment_help', 'ai_tutoring',
        'admin_dashboard', 'bulk_licenses', 'custom_branding',
      ],
    };

    const allowedFeatures = tierFeatures[tier] || tierFeatures.FREE;

    if (!allowedFeatures.includes(feature)) {
      res.status(403).json({
        error: `This feature requires a premium subscription`,
        feature,
        currentTier: tier,
        upgradeUrl: '/pricing',
      });
      return;
    }

    next();
  };
};
