import { Request, Response, NextFunction } from 'express';
import { PrismaClient, QuestionType } from '@prisma/client';
import { z } from 'zod';
import {
  createQuizSchema,
  updateQuizSchema,
  createQuestionSchema,
  updateQuestionSchema,
  generateQuizSchema,
  submitAnswerSchema,
  submitQuizSchema,
} from '@studysync/auth';
import {
  quizGenerationService,
  QuizGenerationOptions,
} from '../services/quizGeneration.service';

const prisma = new PrismaClient();

export class QuizController {
  // ============================================
  // QUIZ CRUD OPERATIONS
  // ============================================

  /**
   * Create a new quiz
   */
  async createQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = createQuizSchema.parse(req.body);

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

      const quiz = await prisma.quiz.create({
        data: {
          userId: req.user.userId,
          title: validatedData.title,
          description: validatedData.description,
          uploadId: validatedData.uploadId,
          timeLimit: validatedData.timeLimit,
          passingScore: validatedData.passingScore,
          isPublic: validatedData.isPublic,
          tags: validatedData.tags,
        },
        include: {
          _count: { select: { questions: true, attempts: true } },
        },
      });

      res.status(201).json({
        message: 'Quiz created successfully',
        quiz,
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
   * Get all quizzes for current user
   */
  async getQuizzes(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const [quizzes, total] = await Promise.all([
        prisma.quiz.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            _count: { select: { questions: true, attempts: true } },
            upload: { select: { id: true, originalName: true } },
            attempts: {
              where: { userId: req.user.userId, completed: true },
              orderBy: { score: 'desc' },
              take: 1,
              select: { score: true, completedAt: true },
            },
          },
        }),
        prisma.quiz.count({ where }),
      ]);

      // Calculate stats for each quiz
      const quizzesWithStats = quizzes.map(quiz => ({
        ...quiz,
        bestScore: quiz.attempts[0]?.score ?? null,
        lastAttempt: quiz.attempts[0]?.completedAt ?? null,
      }));

      res.json({
        quizzes: quizzesWithStats,
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
   * Get a specific quiz with all questions
   */
  async getQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      const quiz = await prisma.quiz.findFirst({
        where: {
          id,
          OR: [
            { userId: req.user.userId },
            { isPublic: true },
          ],
        },
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
          upload: { select: { id: true, originalName: true } },
          _count: { select: { questions: true, attempts: true } },
        },
      });

      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }

      // Get user's attempt stats for this quiz
      const userAttempts = await prisma.quizAttempt.findMany({
        where: { quizId: id, userId: req.user.userId, completed: true },
        orderBy: { completedAt: 'desc' },
        select: { score: true, timeSpent: true, completedAt: true },
      });

      const stats = {
        totalAttempts: userAttempts.length,
        bestScore: userAttempts.length > 0 ? Math.max(...userAttempts.map(a => a.score)) : null,
        averageScore: userAttempts.length > 0
          ? Math.round(userAttempts.reduce((sum, a) => sum + a.score, 0) / userAttempts.length)
          : null,
        lastAttempt: userAttempts[0] || null,
      };

      res.json({
        quiz,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a quiz
   */
  async updateQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const validatedData = updateQuizSchema.parse(req.body);

      const existing = await prisma.quiz.findFirst({
        where: { id, userId: req.user.userId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }

      const updated = await prisma.quiz.update({
        where: { id },
        data: validatedData,
        include: {
          _count: { select: { questions: true, attempts: true } },
        },
      });

      res.json({
        message: 'Quiz updated successfully',
        quiz: updated,
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
   * Delete a quiz
   */
  async deleteQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      const existing = await prisma.quiz.findFirst({
        where: { id, userId: req.user.userId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }

      await prisma.quiz.delete({ where: { id } });

      res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // QUESTIONS CRUD
  // ============================================

  /**
   * Add a question to a quiz
   */
  async addQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId } = req.params;
      const validatedData = createQuestionSchema.parse(req.body);

      // Verify quiz ownership
      const quiz = await prisma.quiz.findFirst({
        where: { id: quizId, userId: req.user.userId },
      });

      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }

      const question = await prisma.question.create({
        data: {
          quizId,
          type: validatedData.type as QuestionType,
          question: validatedData.question,
          options: validatedData.options,
          correctAnswer: validatedData.correctAnswer,
          explanation: validatedData.explanation,
          points: validatedData.points,
          order: validatedData.order,
        },
      });

      res.status(201).json({
        message: 'Question added successfully',
        question,
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
   * Add multiple questions to a quiz
   */
  async addQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId } = req.params;
      const questions = z.array(createQuestionSchema).min(1).max(100).parse(req.body.questions);

      // Verify quiz ownership
      const quiz = await prisma.quiz.findFirst({
        where: { id: quizId, userId: req.user.userId },
      });

      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }

      const created = await prisma.question.createMany({
        data: questions.map((q, index) => ({
          quizId,
          type: q.type as QuestionType,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: q.points,
          order: q.order ?? index,
        })),
      });

      res.status(201).json({
        message: `${created.count} questions added successfully`,
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
   * Update a question
   */
  async updateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId, questionId } = req.params;
      const validatedData = updateQuestionSchema.parse(req.body);

      // Verify ownership through quiz
      const question = await prisma.question.findFirst({
        where: { id: questionId, quizId },
        include: { quiz: { select: { userId: true } } },
      });

      if (!question || question.quiz.userId !== req.user.userId) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      const updated = await prisma.question.update({
        where: { id: questionId },
        data: {
          type: validatedData.type as QuestionType | undefined,
          question: validatedData.question,
          options: validatedData.options ?? undefined,
          correctAnswer: validatedData.correctAnswer,
          explanation: validatedData.explanation,
          points: validatedData.points,
          order: validatedData.order,
        },
      });

      res.json({
        message: 'Question updated successfully',
        question: updated,
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
   * Delete a question
   */
  async deleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId, questionId } = req.params;

      // Verify ownership through quiz
      const question = await prisma.question.findFirst({
        where: { id: questionId, quizId },
        include: { quiz: { select: { userId: true } } },
      });

      if (!question || question.quiz.userId !== req.user.userId) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      await prisma.question.delete({ where: { id: questionId } });

      res.json({ message: 'Question deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // AI GENERATION
  // ============================================

  /**
   * Generate quiz questions from an uploaded document using AI
   */
  async generateFromUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = generateQuizSchema.parse(req.body);

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

      // Generate questions using AI
      const result = await quizGenerationService.generateFromText(
        upload.extractedText,
        validatedData.options as QuizGenerationOptions
      );

      if (result.questions.length === 0) {
        res.status(400).json({ error: 'Could not generate questions from this content' });
        return;
      }

      // Create the quiz with questions
      const quiz = await prisma.quiz.create({
        data: {
          userId: req.user.userId,
          uploadId: upload.id,
          title: validatedData.title || `Quiz from ${upload.originalName}`,
          description: validatedData.description || `AI-generated quiz from ${upload.originalName}`,
          timeLimit: validatedData.timeLimit || Math.ceil(result.questions.length * 1.5), // 1.5 min per question
          tags: result.metadata.topics.slice(0, 10),
          questions: {
            create: result.questions.map((q, index) => ({
              type: q.type,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              points: q.points,
              order: index,
            })),
          },
        },
        include: {
          questions: { orderBy: { order: 'asc' } },
          _count: { select: { questions: true } },
        },
      });

      res.status(201).json({
        message: 'Quiz generated successfully',
        quiz,
        generation: {
          totalGenerated: result.metadata.totalGenerated,
          averageQualityScore: result.metadata.averageQualityScore,
          topics: result.metadata.topics,
          processingTimeMs: result.metadata.processingTimeMs,
          difficultyDistribution: result.metadata.difficultyDistribution,
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
   * Regenerate/add more questions to an existing quiz
   */
  async regenerateQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId } = req.params;
      const options = req.body.options as QuizGenerationOptions | undefined;

      // Get the quiz with its upload
      const quiz = await prisma.quiz.findFirst({
        where: { id: quizId, userId: req.user.userId },
        include: { upload: true, _count: { select: { questions: true } } },
      });

      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }

      if (!quiz.upload?.extractedText) {
        res.status(400).json({ error: 'No source content available for regeneration' });
        return;
      }

      // Generate new questions
      const result = await quizGenerationService.generateFromText(
        quiz.upload.extractedText,
        options
      );

      // Get current max order
      const maxOrder = quiz._count.questions;

      // Add the new questions
      await prisma.question.createMany({
        data: result.questions.map((q, index) => ({
          quizId: quiz.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: q.points,
          order: maxOrder + index,
        })),
      });

      // Update tags if new topics found
      if (result.metadata.topics.length > 0) {
        const existingTags = quiz.tags || [];
        const newTags = [...new Set([...existingTags, ...result.metadata.topics])].slice(0, 20);
        await prisma.quiz.update({
          where: { id: quizId },
          data: { tags: newTags },
        });
      }

      res.json({
        message: `${result.questions.length} additional questions generated`,
        generation: result.metadata,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // QUIZ ATTEMPTS
  // ============================================

  /**
   * Start a new quiz attempt
   */
  async startAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId } = req.params;

      // Verify quiz exists and user has access
      const quiz = await prisma.quiz.findFirst({
        where: {
          id: quizId,
          OR: [
            { userId: req.user.userId },
            { isPublic: true },
          ],
        },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              type: true,
              question: true,
              options: true,
              points: true,
              order: true,
              // Don't include correctAnswer or explanation until submission
            },
          },
        },
      });

      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }

      if (quiz.questions.length === 0) {
        res.status(400).json({ error: 'Quiz has no questions' });
        return;
      }

      // Create the attempt
      const attempt = await prisma.quizAttempt.create({
        data: {
          userId: req.user.userId,
          quizId,
          score: 0,
          timeSpent: 0,
          completed: false,
        },
      });

      res.status(201).json({
        message: 'Quiz attempt started',
        attempt,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          timeLimit: quiz.timeLimit,
          passingScore: quiz.passingScore,
          questions: quiz.questions,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit a single answer during an attempt
   */
  async submitAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId, attemptId } = req.params;
      const { questionId, userAnswer } = submitAnswerSchema.parse(req.body);

      // Verify attempt exists and is not completed
      const attempt = await prisma.quizAttempt.findFirst({
        where: { id: attemptId, quizId, userId: req.user.userId, completed: false },
      });

      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found or already completed' });
        return;
      }

      // Get the question
      const question = await prisma.question.findFirst({
        where: { id: questionId, quizId },
      });

      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      // Check if answer is correct
      const isCorrect = this.checkAnswer(question.type, question.correctAnswer, userAnswer);

      // Upsert the answer (allow changing answers)
      const answer = await prisma.answer.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId,
          },
        },
        create: {
          attemptId,
          questionId,
          userAnswer,
          isCorrect,
        },
        update: {
          userAnswer,
          isCorrect,
        },
      });

      res.json({
        message: 'Answer submitted',
        answer: {
          id: answer.id,
          questionId: answer.questionId,
          userAnswer: answer.userAnswer,
          // Don't reveal if correct until quiz is submitted
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
   * Submit the entire quiz (finalize attempt)
   */
  async submitQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId, attemptId } = req.params;
      const { answers, timeSpent } = submitQuizSchema.parse(req.body);

      // Verify attempt exists and is not completed
      const attempt = await prisma.quizAttempt.findFirst({
        where: { id: attemptId, quizId, userId: req.user.userId, completed: false },
        include: {
          quiz: {
            include: {
              questions: { orderBy: { order: 'asc' } },
            },
          },
        },
      });

      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found or already completed' });
        return;
      }

      // Process all answers
      let totalPoints = 0;
      let earnedPoints = 0;

      const answerResults: Array<{
        questionId: string;
        userAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
        points: number;
        explanation?: string;
      }> = [];

      for (const q of attempt.quiz.questions) {
        totalPoints += q.points;
        const submittedAnswer = answers.find(a => a.questionId === q.id);
        const userAnswer = submittedAnswer?.userAnswer || '';
        const isCorrect = submittedAnswer ? this.checkAnswer(q.type, q.correctAnswer, userAnswer) : false;

        if (isCorrect) {
          earnedPoints += q.points;
        }

        answerResults.push({
          questionId: q.id,
          userAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect,
          points: isCorrect ? q.points : 0,
          explanation: q.explanation || undefined,
        });

        // Upsert answer record
        await prisma.answer.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: q.id,
            },
          },
          create: {
            attemptId,
            questionId: q.id,
            userAnswer,
            isCorrect,
          },
          update: {
            userAnswer,
            isCorrect,
          },
        });
      }

      // Calculate score as percentage
      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

      // Update the attempt
      const updatedAttempt = await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          score,
          timeSpent,
          completed: true,
          completedAt: new Date(),
        },
      });

      const passed = score >= attempt.quiz.passingScore;

      res.json({
        message: 'Quiz submitted successfully',
        result: {
          attempt: updatedAttempt,
          score,
          totalPoints,
          earnedPoints,
          passed,
          passingScore: attempt.quiz.passingScore,
          answers: answerResults,
          summary: {
            total: attempt.quiz.questions.length,
            correct: answerResults.filter(a => a.isCorrect).length,
            incorrect: answerResults.filter(a => !a.isCorrect).length,
          },
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
   * Get attempt results
   */
  async getAttemptResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId, attemptId } = req.params;

      const attempt = await prisma.quizAttempt.findFirst({
        where: { id: attemptId, quizId, userId: req.user.userId },
        include: {
          quiz: {
            include: {
              questions: { orderBy: { order: 'asc' } },
            },
          },
          answers: true,
        },
      });

      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found' });
        return;
      }

      // Build results with answers and explanations
      const answerMap = new Map(attempt.answers.map(a => [a.questionId, a]));
      const results = attempt.quiz.questions.map(q => {
        const answer = answerMap.get(q.id);
        return {
          question: {
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            points: q.points,
          },
          userAnswer: answer?.userAnswer || null,
          isCorrect: answer?.isCorrect || false,
          earnedPoints: answer?.isCorrect ? q.points : 0,
        };
      });

      res.json({
        attempt: {
          id: attempt.id,
          score: attempt.score,
          timeSpent: attempt.timeSpent,
          completed: attempt.completed,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
        },
        quiz: {
          id: attempt.quiz.id,
          title: attempt.quiz.title,
          passingScore: attempt.quiz.passingScore,
        },
        results,
        summary: {
          total: results.length,
          correct: results.filter(r => r.isCorrect).length,
          incorrect: results.filter(r => !r.isCorrect).length,
          passed: attempt.score >= attempt.quiz.passingScore,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get quiz attempt history
   */
  async getAttemptHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      // Verify quiz access
      const quiz = await prisma.quiz.findFirst({
        where: {
          id: quizId,
          OR: [
            { userId: req.user.userId },
            { isPublic: true },
          ],
        },
      });

      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }

      const [attempts, total] = await Promise.all([
        prisma.quizAttempt.findMany({
          where: { quizId, userId: req.user.userId },
          orderBy: { startedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            score: true,
            timeSpent: true,
            completed: true,
            startedAt: true,
            completedAt: true,
          },
        }),
        prisma.quizAttempt.count({
          where: { quizId, userId: req.user.userId },
        }),
      ]);

      // Calculate stats
      const completedAttempts = attempts.filter(a => a.completed);
      const stats = {
        totalAttempts: total,
        completedAttempts: completedAttempts.length,
        bestScore: completedAttempts.length > 0
          ? Math.max(...completedAttempts.map(a => a.score))
          : null,
        averageScore: completedAttempts.length > 0
          ? Math.round(completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length)
          : null,
        averageTime: completedAttempts.length > 0
          ? Math.round(completedAttempts.reduce((sum, a) => sum + a.timeSpent, 0) / completedAttempts.length)
          : null,
      };

      res.json({
        attempts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get quiz statistics
   */
  async getQuizStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId } = req.params;

      const quiz = await prisma.quiz.findFirst({
        where: { id: quizId, userId: req.user.userId },
        include: {
          _count: { select: { questions: true, attempts: true } },
          questions: {
            include: {
              answers: {
                where: {
                  attempt: { completed: true },
                },
              },
            },
          },
        },
      });

      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }

      // Get all completed attempts
      const attempts = await prisma.quizAttempt.findMany({
        where: { quizId, completed: true },
      });

      // Calculate question-level stats
      const questionStats = quiz.questions.map(q => {
        const totalAnswers = q.answers.length;
        const correctAnswers = q.answers.filter(a => a.isCorrect).length;
        return {
          questionId: q.id,
          question: q.question.substring(0, 100),
          type: q.type,
          totalAnswers,
          correctAnswers,
          accuracy: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
        };
      });

      // Sort by accuracy to find hardest/easiest
      const sortedByAccuracy = [...questionStats].sort((a, b) => a.accuracy - b.accuracy);

      res.json({
        quiz: {
          id: quiz.id,
          title: quiz.title,
          totalQuestions: quiz._count.questions,
          totalAttempts: attempts.length,
        },
        overallStats: {
          averageScore: attempts.length > 0
            ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
            : 0,
          highestScore: attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0,
          lowestScore: attempts.length > 0 ? Math.min(...attempts.map(a => a.score)) : 0,
          passRate: attempts.length > 0
            ? Math.round((attempts.filter(a => a.score >= quiz.passingScore).length / attempts.length) * 100)
            : 0,
          averageTime: attempts.length > 0
            ? Math.round(attempts.reduce((sum, a) => sum + a.timeSpent, 0) / attempts.length)
            : 0,
        },
        questionStats,
        hardestQuestions: sortedByAccuracy.slice(0, 5),
        easiestQuestions: sortedByAccuracy.slice(-5).reverse(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's overall quiz stats
   */
  async getUserQuizStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const [quizCount, attemptStats, recentAttempts] = await Promise.all([
        prisma.quiz.count({
          where: { userId: req.user.userId },
        }),
        prisma.quizAttempt.aggregate({
          where: { userId: req.user.userId, completed: true },
          _count: true,
          _avg: { score: true, timeSpent: true },
          _max: { score: true },
        }),
        prisma.quizAttempt.findMany({
          where: { userId: req.user.userId, completed: true },
          orderBy: { completedAt: 'desc' },
          take: 10,
          include: {
            quiz: { select: { id: true, title: true } },
          },
        }),
      ]);

      res.json({
        stats: {
          totalQuizzes: quizCount,
          totalAttempts: attemptStats._count,
          averageScore: attemptStats._avg.score ? Math.round(attemptStats._avg.score) : 0,
          bestScore: attemptStats._max.score || 0,
          averageTime: attemptStats._avg.timeSpent ? Math.round(attemptStats._avg.timeSpent) : 0,
        },
        recentAttempts: recentAttempts.map(a => ({
          id: a.id,
          quizId: a.quizId,
          quizTitle: a.quiz.title,
          score: a.score,
          timeSpent: a.timeSpent,
          completedAt: a.completedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Check if an answer is correct based on question type
   */
  private checkAnswer(type: QuestionType, correctAnswer: string, userAnswer: string): boolean {
    const normalizedUser = userAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();

    switch (type) {
      case 'MULTIPLE_CHOICE':
        // Compare indices
        return normalizedUser === normalizedCorrect;

      case 'TRUE_FALSE':
        // Compare true/false values
        return normalizedUser === normalizedCorrect;

      case 'SHORT_ANSWER': {
        // Flexible matching for short answers
        // Exact match or close match
        if (normalizedUser === normalizedCorrect) return true;
        // Remove punctuation and compare
        const cleanUser = normalizedUser.replace(/[^\w\s]/g, '');
        const cleanCorrect = normalizedCorrect.replace(/[^\w\s]/g, '');
        return cleanUser === cleanCorrect;
      }

      case 'ESSAY':
        // Essays need manual grading, but we can check for keyword presence
        // For now, mark as needing review (always true if any content provided)
        return userAnswer.trim().length > 0;

      default:
        return normalizedUser === normalizedCorrect;
    }
  }
}

export const quizController = new QuizController();
