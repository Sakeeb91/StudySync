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
export const requireActiveSubscription = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const subscriptionStatuses = ['ACTIVE', 'TRIALING'];
    const userStatus = req.user.subscriptionStatus || 'INACTIVE';

    if (!subscriptionStatuses.includes(userStatus)) {
      res.status(403).json({
        error: 'This feature requires an active subscription',
        currentStatus: userStatus,
        upgradeUrl: '/pricing',
      });
      return;
    }

    next();
  };
};
