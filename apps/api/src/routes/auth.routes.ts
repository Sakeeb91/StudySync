import { Router, Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register', authLimiter, (req: Request, res: Response, next: NextFunction) =>
  authController.register(req, res, next)
);

router.post('/login', authLimiter, (req: Request, res: Response, next: NextFunction) =>
  authController.login(req, res, next)
);

router.post('/refresh', (req: Request, res: Response, next: NextFunction) =>
  authController.refreshToken(req, res, next)
);

router.post('/forgot-password', authLimiter, (req: Request, res: Response, next: NextFunction) =>
  authController.forgotPassword(req, res, next)
);

router.post('/reset-password', authLimiter, (req: Request, res: Response, next: NextFunction) =>
  authController.resetPassword(req, res, next)
);

router.get('/verify-email/:token', (req: Request, res: Response, next: NextFunction) =>
  authController.verifyEmail(req, res, next)
);

// Protected routes
router.post('/logout', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  authController.logout(req, res, next)
);

router.get('/me', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  authController.getCurrentUser(req, res, next)
);

router.put('/me', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  authController.updateProfile(req, res, next)
);

router.put('/me/password', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  authController.changePassword(req, res, next)
);

router.delete('/me', authenticateToken, (req: Request, res: Response, next: NextFunction) =>
  authController.deleteAccount(req, res, next)
);

export default router;
