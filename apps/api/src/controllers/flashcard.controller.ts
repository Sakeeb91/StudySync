import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Difficulty } from '@prisma/client';
import { z } from 'zod';
import {
  flashcardGenerationService,
  GenerationOptions,
} from '../services/flashcardGeneration.service';
import { spacedRepetitionService, ReviewResult } from '../services/spacedRepetition.service';

const prisma = new PrismaClient();

// Validation schemas
const createFlashcardSetSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional().default(false),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  uploadId: z.string().optional(),
});

const createFlashcardSchema = z.object({
  question: z.string().min(1).max(2000),
  answer: z.string().min(1).max(5000),
  hint: z.string().max(500).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().default('MEDIUM'),
});

const updateFlashcardSetSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

const updateFlashcardSchema = z.object({
  question: z.string().min(1).max(2000).optional(),
  answer: z.string().min(1).max(5000).optional(),
  hint: z.string().max(500).optional().nullable(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
});

const generateFlashcardsSchema = z.object({
  uploadId: z.string(),
  options: z.object({
    maxCards: z.number().min(5).max(50).optional(),
    minCards: z.number().min(1).max(30).optional(),
    difficulty: z.enum(['mixed', 'easy', 'medium', 'hard']).optional(),
    includeHints: z.boolean().optional(),
    focusTopics: z.array(z.string()).optional(),
    questionTypes: z.array(z.enum(['factual', 'conceptual', 'application', 'fill-in-blank'])).optional(),
  }).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

const reviewFlashcardSchema = z.object({
  quality: z.number().min(0).max(5).int(),
});

const batchReviewSchema = z.object({
  reviews: z.array(z.object({
    flashcardId: z.string(),
    quality: z.number().min(0).max(5).int(),
  })).min(1).max(100),
});

export class FlashcardController {
  // ============================================
  // FLASHCARD SETS
  // ============================================

  /**
   * Create a new flashcard set
   */
  async createSet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = createFlashcardSetSchema.parse(req.body);

      // Verify upload belongs to user if provided
      if (validatedData.uploadId) {
        const upload = await prisma.upload.findFirst({
          where: { id: validatedData.uploadId, userId: req.user.userId },
        });
        if (!upload) {
          res.status(404).json({ error: 'Upload not found' });
          return;
        }
      }

      const flashcardSet = await prisma.flashcardSet.create({
        data: {
          userId: req.user.userId,
          ...validatedData,
        },
        include: {
          _count: { select: { flashcards: true } },
        },
      });

      res.status(201).json({
        message: 'Flashcard set created successfully',
        flashcardSet,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      next(error);
    }
  }

  /**
   * Get all flashcard sets for current user
   */
  async getSets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const search = req.query.search as string | undefined;
      const tag = req.query.tag as string | undefined;

      const where: Record<string, unknown> = { userId: req.user.userId };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (tag) {
        where.tags = { has: tag };
      }

      const [flashcardSets, total] = await Promise.all([
        prisma.flashcardSet.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            _count: { select: { flashcards: true } },
            upload: { select: { id: true, originalName: true } },
          },
        }),
        prisma.flashcardSet.count({ where }),
      ]);

      res.json({
        flashcardSets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific flashcard set with all cards
   */
  async getSet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      const flashcardSet = await prisma.flashcardSet.findFirst({
        where: {
          id,
          OR: [
            { userId: req.user.userId },
            { isPublic: true },
          ],
        },
        include: {
          flashcards: {
            orderBy: { createdAt: 'asc' },
          },
          upload: { select: { id: true, originalName: true } },
          _count: { select: { flashcards: true, studySessions: true } },
        },
      });

      if (!flashcardSet) {
        res.status(404).json({ error: 'Flashcard set not found' });
        return;
      }

      // Calculate study statistics
      const stats = this.calculateSetStats(flashcardSet.flashcards);

      res.json({
        flashcardSet,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a flashcard set
   */
  async updateSet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const validatedData = updateFlashcardSetSchema.parse(req.body);

      const existing = await prisma.flashcardSet.findFirst({
        where: { id, userId: req.user.userId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Flashcard set not found' });
        return;
      }

      const updated = await prisma.flashcardSet.update({
        where: { id },
        data: validatedData,
        include: {
          _count: { select: { flashcards: true } },
        },
      });

      res.json({
        message: 'Flashcard set updated successfully',
        flashcardSet: updated,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      next(error);
    }
  }

  /**
   * Delete a flashcard set
   */
  async deleteSet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      const existing = await prisma.flashcardSet.findFirst({
        where: { id, userId: req.user.userId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Flashcard set not found' });
        return;
      }

      await prisma.flashcardSet.delete({ where: { id } });

      res.json({ message: 'Flashcard set deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // INDIVIDUAL FLASHCARDS
  // ============================================

  /**
   * Add a flashcard to a set
   */
  async addCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { setId } = req.params;
      const validatedData = createFlashcardSchema.parse(req.body);

      // Verify set ownership
      const flashcardSet = await prisma.flashcardSet.findFirst({
        where: { id: setId, userId: req.user.userId },
      });

      if (!flashcardSet) {
        res.status(404).json({ error: 'Flashcard set not found' });
        return;
      }

      const flashcard = await prisma.flashcard.create({
        data: {
          setId,
          ...validatedData,
        },
      });

      res.status(201).json({
        message: 'Flashcard added successfully',
        flashcard,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      next(error);
    }
  }

  /**
   * Add multiple flashcards to a set
   */
  async addCards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { setId } = req.params;
      const cards = z.array(createFlashcardSchema).min(1).max(100).parse(req.body.cards);

      // Verify set ownership
      const flashcardSet = await prisma.flashcardSet.findFirst({
        where: { id: setId, userId: req.user.userId },
      });

      if (!flashcardSet) {
        res.status(404).json({ error: 'Flashcard set not found' });
        return;
      }

      const created = await prisma.flashcard.createMany({
        data: cards.map(card => ({
          setId,
          ...card,
        })),
      });

      res.status(201).json({
        message: `${created.count} flashcards added successfully`,
        count: created.count,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      next(error);
    }
  }

  /**
   * Update a flashcard
   */
  async updateCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { setId, cardId } = req.params;
      const validatedData = updateFlashcardSchema.parse(req.body);

      // Verify ownership through set
      const flashcard = await prisma.flashcard.findFirst({
        where: { id: cardId, setId },
        include: { flashcardSet: { select: { userId: true } } },
      });

      if (!flashcard || flashcard.flashcardSet.userId !== req.user.userId) {
        res.status(404).json({ error: 'Flashcard not found' });
        return;
      }

      const updated = await prisma.flashcard.update({
        where: { id: cardId },
        data: validatedData,
      });

      res.json({
        message: 'Flashcard updated successfully',
        flashcard: updated,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      next(error);
    }
  }

  /**
   * Delete a flashcard
   */
  async deleteCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { setId, cardId } = req.params;

      // Verify ownership through set
      const flashcard = await prisma.flashcard.findFirst({
        where: { id: cardId, setId },
        include: { flashcardSet: { select: { userId: true } } },
      });

      if (!flashcard || flashcard.flashcardSet.userId !== req.user.userId) {
        res.status(404).json({ error: 'Flashcard not found' });
        return;
      }

      await prisma.flashcard.delete({ where: { id: cardId } });

      res.json({ message: 'Flashcard deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // AI GENERATION
  // ============================================

  /**
   * Generate flashcards from an uploaded document using AI
   */
  async generateFromUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = generateFlashcardsSchema.parse(req.body);

      // Get the upload with extracted text
      const upload = await prisma.upload.findFirst({
        where: {
          id: validatedData.uploadId,
          userId: req.user.userId,
          processingStatus: 'COMPLETED',
        },
      });

      if (!upload) {
        res.status(404).json({ error: 'Upload not found or not yet processed' });
        return;
      }

      if (!upload.extractedText) {
        res.status(400).json({ error: 'No text content available for this upload' });
        return;
      }

      // Generate flashcards using AI
      const result = await flashcardGenerationService.generateFromText(
        upload.extractedText,
        validatedData.options as GenerationOptions
      );

      if (result.flashcards.length === 0) {
        res.status(400).json({ error: 'Could not generate flashcards from this content' });
        return;
      }

      // Create the flashcard set
      const flashcardSet = await prisma.flashcardSet.create({
        data: {
          userId: req.user.userId,
          uploadId: upload.id,
          title: validatedData.title || `Flashcards from ${upload.originalName}`,
          description: validatedData.description || `AI-generated flashcards from ${upload.originalName}`,
          tags: result.metadata.topics.slice(0, 10),
        },
      });

      // Create all flashcards
      await prisma.flashcard.createMany({
        data: result.flashcards.map(card => ({
          setId: flashcardSet.id,
          question: card.question,
          answer: card.answer,
          hint: card.hint,
          difficulty: card.difficulty,
        })),
      });

      // Fetch the complete set with cards
      const completeSet = await prisma.flashcardSet.findUnique({
        where: { id: flashcardSet.id },
        include: {
          flashcards: true,
          _count: { select: { flashcards: true } },
        },
      });

      res.status(201).json({
        message: 'Flashcards generated successfully',
        flashcardSet: completeSet,
        generation: {
          totalGenerated: result.metadata.totalGenerated,
          averageQualityScore: result.metadata.averageQualityScore,
          topics: result.metadata.topics,
          processingTimeMs: result.metadata.processingTimeMs,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      next(error);
    }
  }

  /**
   * Regenerate/add more flashcards to an existing set
   */
  async regenerateCards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { setId } = req.params;
      const options = req.body.options as GenerationOptions | undefined;

      // Get the flashcard set with its upload
      const flashcardSet = await prisma.flashcardSet.findFirst({
        where: { id: setId, userId: req.user.userId },
        include: { upload: true },
      });

      if (!flashcardSet) {
        res.status(404).json({ error: 'Flashcard set not found' });
        return;
      }

      if (!flashcardSet.upload?.extractedText) {
        res.status(400).json({ error: 'No source content available for regeneration' });
        return;
      }

      // Generate new flashcards
      const result = await flashcardGenerationService.generateFromText(
        flashcardSet.upload.extractedText,
        options
      );

      // Add the new flashcards
      await prisma.flashcard.createMany({
        data: result.flashcards.map(card => ({
          setId: flashcardSet.id,
          question: card.question,
          answer: card.answer,
          hint: card.hint,
          difficulty: card.difficulty,
        })),
      });

      // Update tags if new topics found
      if (result.metadata.topics.length > 0) {
        const existingTags = flashcardSet.tags || [];
        const newTags = [...new Set([...existingTags, ...result.metadata.topics])].slice(0, 20);
        await prisma.flashcardSet.update({
          where: { id: setId },
          data: { tags: newTags },
        });
      }

      res.json({
        message: `${result.flashcards.length} additional flashcards generated`,
        generation: result.metadata,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // STUDY & SPACED REPETITION
  // ============================================

  /**
   * Get cards due for review
   */
  async getDueCards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { setId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      // Verify set access
      const flashcardSet = await prisma.flashcardSet.findFirst({
        where: {
          id: setId,
          OR: [
            { userId: req.user.userId },
            { isPublic: true },
          ],
        },
      });

      if (!flashcardSet) {
        res.status(404).json({ error: 'Flashcard set not found' });
        return;
      }

      const now = new Date();

      // Get cards due for review (nextReview is null or in the past)
      const dueCards = await prisma.flashcard.findMany({
        where: {
          setId,
          OR: [
            { nextReview: null },
            { nextReview: { lte: now } },
          ],
        },
        orderBy: [
          { nextReview: 'asc' },
          { timesReviewed: 'asc' },
        ],
        take: limit,
      });

      // Get upcoming cards for reference
      const upcomingCount = await prisma.flashcard.count({
        where: {
          setId,
          nextReview: { gt: now },
        },
      });

      res.json({
        dueCards,
        stats: {
          dueNow: dueCards.length,
          upcoming: upcomingCount,
          totalInSet: dueCards.length + upcomingCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record a flashcard review (spaced repetition)
   */
  async reviewCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { setId, cardId } = req.params;
      const { quality } = reviewFlashcardSchema.parse(req.body);

      // Get the flashcard with set info
      const flashcard = await prisma.flashcard.findFirst({
        where: { id: cardId, setId },
        include: { flashcardSet: { select: { userId: true, isPublic: true } } },
      });

      if (!flashcard) {
        res.status(404).json({ error: 'Flashcard not found' });
        return;
      }

      // Allow review for owner or public sets
      const isOwner = flashcard.flashcardSet.userId === req.user.userId;
      if (!isOwner && !flashcard.flashcardSet.isPublic) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Calculate next review using spaced repetition
      const reviewResult = spacedRepetitionService.calculateNextReview(
        flashcard,
        quality as ReviewResult
      );

      // Update the flashcard
      const updated = await prisma.flashcard.update({
        where: { id: cardId },
        data: {
          timesReviewed: { increment: 1 },
          correctCount: quality >= 3 ? { increment: 1 } : undefined,
          lastReviewed: new Date(),
          nextReview: reviewResult.nextReview,
          difficulty: reviewResult.newDifficulty,
        },
      });

      res.json({
        message: 'Review recorded',
        flashcard: updated,
        review: {
          quality,
          wasCorrect: quality >= 3,
          nextReviewIn: reviewResult.intervalDays,
          newDifficulty: reviewResult.newDifficulty,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      next(error);
    }
  }

  /**
   * Batch review multiple cards
   */
  async batchReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { setId } = req.params;
      const { reviews } = batchReviewSchema.parse(req.body);

      // Verify set access
      const flashcardSet = await prisma.flashcardSet.findFirst({
        where: {
          id: setId,
          OR: [
            { userId: req.user.userId },
            { isPublic: true },
          ],
        },
      });

      if (!flashcardSet) {
        res.status(404).json({ error: 'Flashcard set not found' });
        return;
      }

      const isOwner = flashcardSet.userId === req.user.userId;

      // Get all flashcards being reviewed
      const cardIds = reviews.map(r => r.flashcardId);
      const flashcards = await prisma.flashcard.findMany({
        where: { id: { in: cardIds }, setId },
      });

      const cardMap = new Map(flashcards.map(c => [c.id, c]));
      const results: Array<{ cardId: string; success: boolean; error?: string }> = [];

      // Process each review
      for (const review of reviews) {
        const flashcard = cardMap.get(review.flashcardId);
        if (!flashcard) {
          results.push({ cardId: review.flashcardId, success: false, error: 'Card not found' });
          continue;
        }

        const reviewResult = spacedRepetitionService.calculateNextReview(
          flashcard,
          review.quality as ReviewResult
        );

        await prisma.flashcard.update({
          where: { id: review.flashcardId },
          data: {
            timesReviewed: { increment: 1 },
            correctCount: review.quality >= 3 ? { increment: 1 } : undefined,
            lastReviewed: new Date(),
            nextReview: reviewResult.nextReview,
            difficulty: reviewResult.newDifficulty,
          },
        });

        results.push({ cardId: review.flashcardId, success: true });
      }

      // Record study session if owner
      if (isOwner && results.filter(r => r.success).length > 0) {
        const correctCount = reviews.filter(r => r.quality >= 3).length;
        await prisma.studySession.create({
          data: {
            userId: req.user.userId,
            flashcardSetId: setId,
            duration: 0, // Will be updated by frontend with actual duration
            cardsStudied: results.filter(r => r.success).length,
            accuracy: correctCount / reviews.length,
          },
        });
      }

      res.json({
        message: 'Batch review completed',
        results,
        summary: {
          total: reviews.length,
          successful: results.filter(r => r.success).length,
          correct: reviews.filter(r => r.quality >= 3).length,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      next(error);
    }
  }

  // ============================================
  // STUDY SESSIONS
  // ============================================

  /**
   * Start a study session
   */
  async startStudySession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { setId } = req.params;

      // Verify set exists and user has access
      const flashcardSet = await prisma.flashcardSet.findFirst({
        where: {
          id: setId,
          OR: [
            { userId: req.user.userId },
            { isPublic: true },
          ],
        },
      });

      if (!flashcardSet) {
        res.status(404).json({ error: 'Flashcard set not found' });
        return;
      }

      const session = await prisma.studySession.create({
        data: {
          userId: req.user.userId,
          flashcardSetId: setId,
          duration: 0,
          cardsStudied: 0,
        },
      });

      res.status(201).json({
        message: 'Study session started',
        session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * End a study session
   */
  async endStudySession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { sessionId } = req.params;
      const { duration, cardsStudied, accuracy } = req.body;

      const session = await prisma.studySession.findFirst({
        where: { id: sessionId, userId: req.user.userId },
      });

      if (!session) {
        res.status(404).json({ error: 'Study session not found' });
        return;
      }

      const updated = await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          duration: duration || Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
          cardsStudied: cardsStudied || session.cardsStudied,
          accuracy: accuracy !== undefined ? accuracy : session.accuracy,
          endedAt: new Date(),
        },
      });

      res.json({
        message: 'Study session ended',
        session: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get study history
   */
  async getStudyHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const setId = req.query.setId as string | undefined;

      const where: Record<string, unknown> = { userId: req.user.userId };
      if (setId) {
        where.flashcardSetId = setId;
      }

      const [sessions, total] = await Promise.all([
        prisma.studySession.findMany({
          where,
          orderBy: { startedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            flashcardSet: { select: { id: true, title: true } },
          },
        }),
        prisma.studySession.count({ where }),
      ]);

      // Calculate aggregates
      const aggregates = await prisma.studySession.aggregate({
        where: { userId: req.user.userId },
        _sum: { duration: true, cardsStudied: true },
        _avg: { accuracy: true },
        _count: true,
      });

      res.json({
        sessions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          totalSessions: aggregates._count,
          totalDuration: aggregates._sum.duration || 0,
          totalCardsStudied: aggregates._sum.cardsStudied || 0,
          averageAccuracy: Math.round((aggregates._avg.accuracy || 0) * 100),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Calculate statistics for a flashcard set
   */
  private calculateSetStats(flashcards: Array<{
    difficulty: Difficulty;
    timesReviewed: number;
    correctCount: number;
    nextReview: Date | null;
  }>) {
    const now = new Date();
    const total = flashcards.length;

    if (total === 0) {
      return {
        total: 0,
        dueNow: 0,
        mastered: 0,
        learning: 0,
        byDifficulty: { EASY: 0, MEDIUM: 0, HARD: 0 },
        averageAccuracy: 0,
      };
    }

    const dueNow = flashcards.filter(f => !f.nextReview || f.nextReview <= now).length;
    const mastered = flashcards.filter(f =>
      f.timesReviewed >= 5 && f.correctCount / f.timesReviewed >= 0.8
    ).length;
    const learning = total - mastered;

    const byDifficulty = {
      EASY: flashcards.filter(f => f.difficulty === 'EASY').length,
      MEDIUM: flashcards.filter(f => f.difficulty === 'MEDIUM').length,
      HARD: flashcards.filter(f => f.difficulty === 'HARD').length,
    };

    const totalReviewed = flashcards.reduce((sum, f) => sum + f.timesReviewed, 0);
    const totalCorrect = flashcards.reduce((sum, f) => sum + f.correctCount, 0);
    const averageAccuracy = totalReviewed > 0
      ? Math.round((totalCorrect / totalReviewed) * 100)
      : 0;

    return {
      total,
      dueNow,
      mastered,
      learning,
      byDifficulty,
      averageAccuracy,
    };
  }
}

export const flashcardController = new FlashcardController();
