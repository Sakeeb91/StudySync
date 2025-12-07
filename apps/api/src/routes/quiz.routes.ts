import { Router, Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { quizController } from '../controllers/quiz.controller';
import { authenticateToken } from '../middleware/auth.middleware';

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
// QUIZZES
// ============================================

// POST /api/quizzes - Create a new quiz
router.post('/', (req: Request, res: Response, next: NextFunction) =>
  quizController.createQuiz(req, res, next)
);

// GET /api/quizzes - Get all quizzes for current user
router.get('/', (req: Request, res: Response, next: NextFunction) =>
  quizController.getQuizzes(req, res, next)
);

// GET /api/quizzes/stats - Get user's overall quiz stats
router.get('/stats', (req: Request, res: Response, next: NextFunction) =>
  quizController.getUserQuizStats(req, res, next)
);

// GET /api/quizzes/:id - Get a specific quiz with questions
router.get('/:id', (req: Request, res: Response, next: NextFunction) =>
  quizController.getQuiz(req, res, next)
);

// PUT /api/quizzes/:id - Update a quiz
router.put('/:id', (req: Request, res: Response, next: NextFunction) =>
  quizController.updateQuiz(req, res, next)
);

// DELETE /api/quizzes/:id - Delete a quiz
router.delete('/:id', (req: Request, res: Response, next: NextFunction) =>
  quizController.deleteQuiz(req, res, next)
);

// GET /api/quizzes/:quizId/stats - Get quiz statistics
router.get('/:quizId/stats', (req: Request, res: Response, next: NextFunction) =>
  quizController.getQuizStats(req, res, next)
);

// ============================================
// AI GENERATION
// ============================================

// POST /api/quizzes/generate - Generate quiz from an upload using AI
router.post(
  '/generate',
  generationLimiter,
  (req: Request, res: Response, next: NextFunction) =>
    quizController.generateFromUpload(req, res, next)
);

// POST /api/quizzes/:quizId/regenerate - Generate more questions for an existing quiz
router.post(
  '/:quizId/regenerate',
  generationLimiter,
  (req: Request, res: Response, next: NextFunction) =>
    quizController.regenerateQuestions(req, res, next)
);

// ============================================
// QUESTIONS
// ============================================

// POST /api/quizzes/:quizId/questions - Add a question to a quiz
router.post('/:quizId/questions', (req: Request, res: Response, next: NextFunction) =>
  quizController.addQuestion(req, res, next)
);

// POST /api/quizzes/:quizId/questions/batch - Add multiple questions to a quiz
router.post('/:quizId/questions/batch', (req: Request, res: Response, next: NextFunction) =>
  quizController.addQuestions(req, res, next)
);

// PUT /api/quizzes/:quizId/questions/:questionId - Update a question
router.put('/:quizId/questions/:questionId', (req: Request, res: Response, next: NextFunction) =>
  quizController.updateQuestion(req, res, next)
);

// DELETE /api/quizzes/:quizId/questions/:questionId - Delete a question
router.delete('/:quizId/questions/:questionId', (req: Request, res: Response, next: NextFunction) =>
  quizController.deleteQuestion(req, res, next)
);

// ============================================
// QUIZ ATTEMPTS
// ============================================

// POST /api/quizzes/:quizId/attempt - Start a new quiz attempt
router.post('/:quizId/attempt', (req: Request, res: Response, next: NextFunction) =>
  quizController.startAttempt(req, res, next)
);

// POST /api/quizzes/:quizId/attempt/:attemptId/answer - Submit a single answer
router.post('/:quizId/attempt/:attemptId/answer', (req: Request, res: Response, next: NextFunction) =>
  quizController.submitAnswer(req, res, next)
);

// POST /api/quizzes/:quizId/attempt/:attemptId/submit - Submit the entire quiz
router.post('/:quizId/attempt/:attemptId/submit', (req: Request, res: Response, next: NextFunction) =>
  quizController.submitQuiz(req, res, next)
);

// GET /api/quizzes/:quizId/attempts - Get attempt history for a quiz
router.get('/:quizId/attempts', (req: Request, res: Response, next: NextFunction) =>
  quizController.getAttemptHistory(req, res, next)
);

// GET /api/quizzes/:quizId/attempts/:attemptId - Get specific attempt results
router.get('/:quizId/attempts/:attemptId', (req: Request, res: Response, next: NextFunction) =>
  quizController.getAttemptResults(req, res, next)
);

export default router;
