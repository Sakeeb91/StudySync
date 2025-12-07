import { Router, Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { BetaController } from '../controllers/beta.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware';

const router = Router();
const betaController = new BetaController();

// Rate limiting for public endpoints
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 applications per hour per IP
  message: { error: 'Too many applications, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for analytics events
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 events per minute
  message: { error: 'Too many events, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================
// Public Routes
// ==================

// Beta Application
router.post('/apply', applicationLimiter, (req: Request, res: Response, next: NextFunction) =>
  betaController.submitApplication(req, res, next)
);

router.get('/application/:email', (req: Request, res: Response, next: NextFunction) =>
  betaController.getApplicationStatus(req, res, next)
);

// Feature Flags (public, uses optional auth for personalization)
router.get('/features', optionalAuth, (req: Request, res: Response, next: NextFunction) =>
  betaController.getEnabledFeatures(req, res, next)
);

router.get('/features/:featureName', optionalAuth, (req: Request, res: Response, next: NextFunction) =>
  betaController.checkFeature(req, res, next)
);

// Analytics Events (public, uses optional auth for user tracking)
router.post('/events', optionalAuth, analyticsLimiter, (req: Request, res: Response, next: NextFunction) =>
  betaController.trackEvent(req, res, next)
);

router.post('/events/batch', optionalAuth, analyticsLimiter, (req: Request, res: Response, next: NextFunction) =>
  betaController.trackBatchEvents(req, res, next)
);

// ==================
// Protected Routes (require authentication)
// ==================

// Beta Tester Status
router.get('/status', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.getBetaTesterStatus(req, res, next)
);

// Feedback
router.post('/feedback', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.submitFeedback(req, res, next)
);

router.get('/feedback', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.getUserFeedback(req, res, next)
);

// ==================
// Admin Routes (TODO: Add admin role check middleware)
// ==================

// Application Management
router.get('/admin/applications', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.getApplications(req, res, next)
);

router.put('/admin/applications/:id', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.reviewApplication(req, res, next)
);

// Beta Tester Management
router.get('/admin/testers', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.getBetaTesters(req, res, next)
);

router.post('/admin/testers', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.createBetaTester(req, res, next)
);

router.put('/admin/testers/:id', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.updateBetaTester(req, res, next)
);

// Feedback Management
router.get('/admin/feedback', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.getAllFeedback(req, res, next)
);

router.put('/admin/feedback/:id', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.updateFeedbackStatus(req, res, next)
);

// Feature Flag Management
router.get('/admin/features', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.getFeatures(req, res, next)
);

router.post('/admin/features', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.createFeature(req, res, next)
);

router.put('/admin/features/:id', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.updateFeature(req, res, next)
);

router.delete('/admin/features/:id', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.deleteFeature(req, res, next)
);

// Analytics
router.get('/admin/analytics', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.getAnalyticsSummary(req, res, next)
);

router.get('/admin/metrics', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  betaController.getBetaMetrics(req, res, next)
);

export default router;
