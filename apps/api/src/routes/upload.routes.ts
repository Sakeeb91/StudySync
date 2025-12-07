import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { uploadController } from '../controllers/upload.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10, // Max 10 files per request
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// Rate limiting for uploads (more restrictive)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 uploads per window
  message: { error: 'Too many uploads, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for AI generation (more restrictive due to API costs)
const generationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 generation requests per window
  message: { error: 'Too many generation requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Error handling middleware for multer errors
const handleMulterError = (
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File too large. Maximum size is 50MB' });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({ error: 'Too many files. Maximum is 10 files per upload' });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  if (err.message.includes('Unsupported file type')) {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
};

// All routes require authentication
router.use(authenticateToken);

// POST /api/uploads - Upload a single file
router.post(
  '/',
  uploadLimiter,
  upload.single('file'),
  handleMulterError,
  (req: Request, res: Response, next: NextFunction) =>
    uploadController.uploadFile(req, res, next)
);

// POST /api/uploads/batch - Upload multiple files
router.post(
  '/batch',
  uploadLimiter,
  upload.array('files', 10),
  handleMulterError,
  (req: Request, res: Response, next: NextFunction) =>
    uploadController.uploadMultipleFiles(req, res, next)
);

// GET /api/uploads - Get all uploads for current user
router.get('/', (req: Request, res: Response, next: NextFunction) =>
  uploadController.getUploads(req, res, next)
);

// GET /api/uploads/:id - Get a specific upload
router.get('/:id', (req: Request, res: Response, next: NextFunction) =>
  uploadController.getUpload(req, res, next)
);

// PUT /api/uploads/:id - Update upload metadata
router.put('/:id', (req: Request, res: Response, next: NextFunction) =>
  uploadController.updateUpload(req, res, next)
);

// DELETE /api/uploads/:id - Delete an upload
router.delete('/:id', (req: Request, res: Response, next: NextFunction) =>
  uploadController.deleteUpload(req, res, next)
);

// POST /api/uploads/:id/retry - Retry processing a failed upload
router.post('/:id/retry', (req: Request, res: Response, next: NextFunction) =>
  uploadController.retryProcessing(req, res, next)
);

// POST /api/uploads/:id/generate-flashcards - Generate flashcards from upload
router.post(
  '/:id/generate-flashcards',
  generationLimiter,
  (req: Request, res: Response, next: NextFunction) =>
    uploadController.generateFlashcards(req, res, next)
);

// GET /api/uploads/:id/estimate-flashcards - Estimate flashcard count
router.get('/:id/estimate-flashcards', (req: Request, res: Response, next: NextFunction) =>
  uploadController.estimateFlashcards(req, res, next)
);

export default router;
