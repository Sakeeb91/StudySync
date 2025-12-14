import { Router, Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { flashcardController } from '../controllers/flashcard.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { checkFlashcardSetLimit } from '../middleware/subscription.middleware';

const router = Router();

// Rate limiting for AI generation (more restrictive due to API costs)
const generationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 generation requests per window
  message: { error: 'Too many generation requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All routes require authentication
router.use(authenticateToken);

// ============================================
// FLASHCARD SETS
// ============================================

// POST /api/flashcards - Create a new flashcard set
router.post('/', checkFlashcardSetLimit, (req: Request, res: Response, next: NextFunction) =>
  flashcardController.createSet(req, res, next)
);

// GET /api/flashcards - Get all flashcard sets for current user
router.get('/', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.getSets(req, res, next)
);

// GET /api/flashcards/:id - Get a specific flashcard set with all cards
router.get('/:id', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.getSet(req, res, next)
);

// PUT /api/flashcards/:id - Update a flashcard set
router.put('/:id', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.updateSet(req, res, next)
);

// DELETE /api/flashcards/:id - Delete a flashcard set
router.delete('/:id', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.deleteSet(req, res, next)
);

// ============================================
// AI GENERATION
// ============================================

// POST /api/flashcards/generate - Generate flashcards from an upload using AI
router.post(
  '/generate',
  generationLimiter,
  (req: Request, res: Response, next: NextFunction) =>
    flashcardController.generateFromUpload(req, res, next)
);

// POST /api/flashcards/:setId/regenerate - Generate more flashcards for an existing set
router.post(
  '/:setId/regenerate',
  generationLimiter,
  (req: Request, res: Response, next: NextFunction) =>
    flashcardController.regenerateCards(req, res, next)
);

// ============================================
// INDIVIDUAL FLASHCARDS
// ============================================

// POST /api/flashcards/:setId/cards - Add a flashcard to a set
router.post('/:setId/cards', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.addCard(req, res, next)
);

// POST /api/flashcards/:setId/cards/batch - Add multiple flashcards to a set
router.post('/:setId/cards/batch', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.addCards(req, res, next)
);

// PUT /api/flashcards/:setId/cards/:cardId - Update a flashcard
router.put('/:setId/cards/:cardId', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.updateCard(req, res, next)
);

// DELETE /api/flashcards/:setId/cards/:cardId - Delete a flashcard
router.delete('/:setId/cards/:cardId', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.deleteCard(req, res, next)
);

// ============================================
// STUDY & SPACED REPETITION
// ============================================

// GET /api/flashcards/:setId/due - Get cards due for review
router.get('/:setId/due', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.getDueCards(req, res, next)
);

// POST /api/flashcards/:setId/cards/:cardId/review - Record a flashcard review
router.post('/:setId/cards/:cardId/review', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.reviewCard(req, res, next)
);

// POST /api/flashcards/:setId/review/batch - Batch review multiple cards
router.post('/:setId/review/batch', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.batchReview(req, res, next)
);

// ============================================
// STUDY SESSIONS
// ============================================

// POST /api/flashcards/:setId/study/start - Start a study session
router.post('/:setId/study/start', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.startStudySession(req, res, next)
);

// POST /api/flashcards/study/:sessionId/end - End a study session
router.post('/study/:sessionId/end', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.endStudySession(req, res, next)
);

// GET /api/flashcards/study/history - Get study history
router.get('/study/history', (req: Request, res: Response, next: NextFunction) =>
  flashcardController.getStudyHistory(req, res, next)
);

export default router;
