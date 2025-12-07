import { Request, Response, NextFunction } from 'express';
import { PrismaClient, BetaApplicationStatus, BetaTesterStatus, FeedbackType, FeedbackCategory, FeedbackStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Helper to convert Record to Prisma Json type
function toJsonValue(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

// Validation schemas
const betaApplicationSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  university: z.string().min(2, 'University is required'),
  major: z.string().optional(),
  yearOfStudy: z.number().min(1).max(10).optional(),
  studyHoursPerWeek: z.number().min(0).max(168).optional(),
  currentTools: z.array(z.string()).optional(),
  painPoints: z.string().optional(),
  referralSource: z.string().optional(),
});

const feedbackSchema = z.object({
  type: z.nativeEnum(FeedbackType),
  category: z.nativeEnum(FeedbackCategory),
  title: z.string().optional(),
  content: z.string().min(10, 'Feedback must be at least 10 characters'),
  rating: z.number().min(1).max(5).optional(),
  npsScore: z.number().min(0).max(10).optional(),
  featureName: z.string().optional(),
  pageUrl: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const analyticsEventSchema = z.object({
  eventType: z.string().min(1, 'Event type is required'),
  eventName: z.string().min(1, 'Event name is required'),
  properties: z.record(z.unknown()).optional(),
  pageUrl: z.string().optional(),
  referrer: z.string().optional(),
  sessionId: z.string().optional(),
});

export class BetaController {
  // Beta Application Endpoints
  async submitApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = betaApplicationSchema.parse(req.body);

      // Check for existing application
      const existingApplication = await prisma.betaApplication.findUnique({
        where: { email: validatedData.email },
      });

      if (existingApplication) {
        res.status(409).json({
          error: 'An application with this email already exists',
          status: existingApplication.status,
        });
        return;
      }

      // Create application
      const application = await prisma.betaApplication.create({
        data: {
          email: validatedData.email,
          name: validatedData.name,
          university: validatedData.university,
          major: validatedData.major,
          yearOfStudy: validatedData.yearOfStudy,
          studyHoursPerWeek: validatedData.studyHoursPerWeek,
          currentTools: validatedData.currentTools || [],
          painPoints: validatedData.painPoints,
          referralSource: validatedData.referralSource,
        },
      });

      res.status(201).json({
        message: 'Beta application submitted successfully',
        application: {
          id: application.id,
          email: application.email,
          name: application.name,
          status: application.status,
          createdAt: application.createdAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  async getApplicationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.params;

      const application = await prisma.betaApplication.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
        },
      });

      if (!application) {
        res.status(404).json({ error: 'Application not found' });
        return;
      }

      res.json({ application });
    } catch (error) {
      next(error);
    }
  }

  // Beta Tester Status (for authenticated users)
  async getBetaTesterStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const betaTester = await prisma.betaTester.findUnique({
        where: { userId: req.user.userId },
        include: {
          application: {
            select: {
              email: true,
              name: true,
              university: true,
            },
          },
        },
      });

      if (!betaTester) {
        res.json({ isBetaTester: false });
        return;
      }

      res.json({
        isBetaTester: true,
        betaTester: {
          id: betaTester.id,
          cohort: betaTester.cohort,
          status: betaTester.status,
          featuresEnabled: betaTester.featuresEnabled,
          joinedAt: betaTester.joinedAt,
          lastActiveAt: betaTester.lastActiveAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Feedback Endpoints
  async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const validatedData = feedbackSchema.parse(req.body);

      // Get beta tester record
      const betaTester = await prisma.betaTester.findUnique({
        where: { userId: req.user.userId },
      });

      if (!betaTester) {
        res.status(403).json({ error: 'Only beta testers can submit feedback' });
        return;
      }

      // Create feedback
      const feedback = await prisma.betaFeedback.create({
        data: {
          betaTesterId: betaTester.id,
          userId: req.user.userId,
          type: validatedData.type,
          category: validatedData.category,
          title: validatedData.title,
          content: validatedData.content,
          rating: validatedData.rating,
          npsScore: validatedData.npsScore,
          featureName: validatedData.featureName,
          pageUrl: validatedData.pageUrl,
          metadata: toJsonValue(validatedData.metadata),
        },
      });

      res.status(201).json({
        message: 'Feedback submitted successfully',
        feedback: {
          id: feedback.id,
          type: feedback.type,
          category: feedback.category,
          status: feedback.status,
          createdAt: feedback.createdAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  async getUserFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const betaTester = await prisma.betaTester.findUnique({
        where: { userId: req.user.userId },
      });

      if (!betaTester) {
        res.json({ feedback: [] });
        return;
      }

      const feedback = await prisma.betaFeedback.findMany({
        where: { betaTesterId: betaTester.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          category: true,
          title: true,
          content: true,
          rating: true,
          npsScore: true,
          status: true,
          resolution: true,
          createdAt: true,
          resolvedAt: true,
        },
      });

      res.json({ feedback });
    } catch (error) {
      next(error);
    }
  }

  // Analytics Event Tracking
  async trackEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = analyticsEventSchema.parse(req.body);

      // Extract user info from request
      const userId = req.user?.userId || null;
      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.socket.remoteAddress || null;

      // Parse user agent for device info (basic parsing)
      let deviceType = 'desktop';
      let browser = 'unknown';
      let os = 'unknown';

      if (userAgent) {
        if (/mobile/i.test(userAgent)) deviceType = 'mobile';
        else if (/tablet/i.test(userAgent)) deviceType = 'tablet';

        if (/chrome/i.test(userAgent)) browser = 'chrome';
        else if (/firefox/i.test(userAgent)) browser = 'firefox';
        else if (/safari/i.test(userAgent)) browser = 'safari';
        else if (/edge/i.test(userAgent)) browser = 'edge';

        if (/windows/i.test(userAgent)) os = 'windows';
        else if (/mac/i.test(userAgent)) os = 'macos';
        else if (/linux/i.test(userAgent)) os = 'linux';
        else if (/android/i.test(userAgent)) os = 'android';
        else if (/ios|iphone|ipad/i.test(userAgent)) os = 'ios';
      }

      // Create analytics event
      const event = await prisma.analyticsEvent.create({
        data: {
          userId,
          sessionId: validatedData.sessionId,
          eventType: validatedData.eventType,
          eventName: validatedData.eventName,
          properties: toJsonValue(validatedData.properties),
          pageUrl: validatedData.pageUrl,
          referrer: validatedData.referrer,
          userAgent,
          ipAddress,
          deviceType,
          browser,
          os,
        },
      });

      // Update beta tester last active time if applicable
      if (userId) {
        await prisma.betaTester.updateMany({
          where: { userId },
          data: { lastActiveAt: new Date() },
        });
      }

      res.status(201).json({
        success: true,
        eventId: event.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  async trackBatchEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({ error: 'Events array is required' });
        return;
      }

      if (events.length > 100) {
        res.status(400).json({ error: 'Maximum 100 events per batch' });
        return;
      }

      const userId = req.user?.userId || null;
      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.socket.remoteAddress || null;

      const validEvents = events
        .map((event) => {
          try {
            return analyticsEventSchema.parse(event);
          } catch {
            return null;
          }
        })
        .filter((event): event is z.infer<typeof analyticsEventSchema> => event !== null);

      if (validEvents.length === 0) {
        res.status(400).json({ error: 'No valid events in batch' });
        return;
      }

      // Create all events
      await prisma.analyticsEvent.createMany({
        data: validEvents.map((event) => ({
          userId,
          sessionId: event.sessionId,
          eventType: event.eventType,
          eventName: event.eventName,
          properties: toJsonValue(event.properties),
          pageUrl: event.pageUrl,
          referrer: event.referrer,
          userAgent,
          ipAddress,
        })),
      });

      res.status(201).json({
        success: true,
        eventsTracked: validEvents.length,
        eventsSkipped: events.length - validEvents.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Feature Flags
  async getEnabledFeatures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      // Get all enabled features
      const features = await prisma.betaFeature.findMany({
        where: { isEnabled: true },
      });

      // Get user's beta tester record if authenticated
      let betaTester = null;
      if (userId) {
        betaTester = await prisma.betaTester.findUnique({
          where: { userId },
        });
      }

      // Filter features based on user's access
      const enabledFeatures = features.filter((feature) => {
        // Check if user has specific access
        if (userId && feature.allowedUsers.includes(userId)) {
          return true;
        }

        // Check if user's cohort has access
        if (betaTester && feature.allowedCohorts.includes(betaTester.cohort || '')) {
          return true;
        }

        // Check rollout percentage (use user ID hash for consistency)
        if (feature.rolloutPercentage > 0) {
          if (userId) {
            const hash = this.hashString(userId);
            return (hash % 100) < feature.rolloutPercentage;
          }
          // For anonymous users, use random based on session
          return Math.random() * 100 < feature.rolloutPercentage;
        }

        return false;
      });

      res.json({
        features: enabledFeatures.map((f) => ({
          name: f.name,
          description: f.description,
          metadata: f.metadata,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  async checkFeature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { featureName } = req.params;
      const userId = req.user?.userId;

      const feature = await prisma.betaFeature.findUnique({
        where: { name: featureName },
      });

      if (!feature || !feature.isEnabled) {
        res.json({ enabled: false });
        return;
      }

      // Check access
      let enabled = false;

      if (userId && feature.allowedUsers.includes(userId)) {
        enabled = true;
      } else if (userId) {
        const betaTester = await prisma.betaTester.findUnique({
          where: { userId },
        });

        if (betaTester && feature.allowedCohorts.includes(betaTester.cohort || '')) {
          enabled = true;
        } else if (feature.rolloutPercentage > 0) {
          const hash = this.hashString(userId);
          enabled = (hash % 100) < feature.rolloutPercentage;
        }
      }

      res.json({
        enabled,
        feature: enabled ? {
          name: feature.name,
          description: feature.description,
          metadata: feature.metadata,
        } : null,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin Endpoints
  async getApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where = status ? { status: status as BetaApplicationStatus } : {};

      const [applications, total] = await Promise.all([
        prisma.betaApplication.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.betaApplication.count({ where }),
      ]);

      res.json({
        applications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async reviewApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!['APPROVED', 'REJECTED', 'WAITLISTED'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const application = await prisma.betaApplication.update({
        where: { id },
        data: {
          status,
          reviewedAt: new Date(),
          reviewedBy: req.user?.userId,
          reviewNotes: notes,
        },
      });

      res.json({
        message: `Application ${status.toLowerCase()}`,
        application,
      });
    } catch (error) {
      next(error);
    }
  }

  async createBetaTester(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, applicationId, cohort, featuresEnabled } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if already a beta tester
      const existing = await prisma.betaTester.findUnique({ where: { userId } });
      if (existing) {
        res.status(409).json({ error: 'User is already a beta tester' });
        return;
      }

      const betaTester = await prisma.betaTester.create({
        data: {
          userId,
          applicationId,
          cohort,
          featuresEnabled: featuresEnabled || [],
        },
      });

      res.status(201).json({
        message: 'Beta tester created successfully',
        betaTester,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBetaTesters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, cohort, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: Record<string, unknown> = {};
      if (status) where.status = status as BetaTesterStatus;
      if (cohort) where.cohort = cohort;

      const [testers, total] = await Promise.all([
        prisma.betaTester.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                university: true,
              },
            },
            application: {
              select: {
                email: true,
                university: true,
              },
            },
            _count: {
              select: { feedback: true },
            },
          },
          orderBy: { joinedAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.betaTester.count({ where }),
      ]);

      res.json({
        testers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBetaTester(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, cohort, featuresEnabled, notes } = req.body;

      const betaTester = await prisma.betaTester.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(cohort !== undefined && { cohort }),
          ...(featuresEnabled && { featuresEnabled }),
          ...(notes !== undefined && { notes }),
        },
      });

      res.json({
        message: 'Beta tester updated',
        betaTester,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, category, status, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: Record<string, unknown> = {};
      if (type) where.type = type as FeedbackType;
      if (category) where.category = category as FeedbackCategory;
      if (status) where.status = status as FeedbackStatus;

      const [feedback, total] = await Promise.all([
        prisma.betaFeedback.findMany({
          where,
          include: {
            betaTester: {
              include: {
                user: {
                  select: {
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.betaFeedback.count({ where }),
      ]);

      res.json({
        feedback,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFeedbackStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, resolution } = req.body;

      if (!Object.values(FeedbackStatus).includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const feedback = await prisma.betaFeedback.update({
        where: { id },
        data: {
          status,
          resolution,
          ...(status === FeedbackStatus.RESOLVED && {
            resolvedAt: new Date(),
            resolvedBy: req.user?.userId,
          }),
        },
      });

      res.json({
        message: 'Feedback status updated',
        feedback,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAnalyticsSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get various metrics
      const [
        totalEvents,
        uniqueUsers,
        eventsByType,
        eventsByDay,
        topPages,
        deviceBreakdown,
      ] = await Promise.all([
        // Total events
        prisma.analyticsEvent.count({
          where: { createdAt: { gte: start, lte: end } },
        }),
        // Unique users
        prisma.analyticsEvent.groupBy({
          by: ['userId'],
          where: {
            createdAt: { gte: start, lte: end },
            userId: { not: null },
          },
        }).then((r) => r.length),
        // Events by type
        prisma.analyticsEvent.groupBy({
          by: ['eventType'],
          where: { createdAt: { gte: start, lte: end } },
          _count: true,
        }),
        // Events by day
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM "AnalyticsEvent"
          WHERE created_at >= ${start} AND created_at <= ${end}
          GROUP BY DATE(created_at)
          ORDER BY date
        `,
        // Top pages
        prisma.analyticsEvent.groupBy({
          by: ['pageUrl'],
          where: {
            createdAt: { gte: start, lte: end },
            pageUrl: { not: null },
          },
          _count: true,
          orderBy: { _count: { pageUrl: 'desc' } },
          take: 10,
        }),
        // Device breakdown
        prisma.analyticsEvent.groupBy({
          by: ['deviceType'],
          where: { createdAt: { gte: start, lte: end } },
          _count: true,
        }),
      ]);

      res.json({
        summary: {
          totalEvents,
          uniqueUsers,
          dateRange: { start, end },
        },
        eventsByType: eventsByType.map((e) => ({
          type: e.eventType,
          count: e._count,
        })),
        eventsByDay,
        topPages: topPages.map((p) => ({
          url: p.pageUrl,
          count: p._count,
        })),
        deviceBreakdown: deviceBreakdown.map((d) => ({
          device: d.deviceType,
          count: d._count,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  async getBetaMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalApplications,
        applicationsByStatus,
        totalTesters,
        testersByStatus,
        testersByCohort,
        feedbackCount,
        feedbackByType,
        avgNpsScore,
        recentActivity,
      ] = await Promise.all([
        // Total applications
        prisma.betaApplication.count(),
        // Applications by status
        prisma.betaApplication.groupBy({
          by: ['status'],
          _count: true,
        }),
        // Total testers
        prisma.betaTester.count(),
        // Testers by status
        prisma.betaTester.groupBy({
          by: ['status'],
          _count: true,
        }),
        // Testers by cohort
        prisma.betaTester.groupBy({
          by: ['cohort'],
          _count: true,
        }),
        // Total feedback
        prisma.betaFeedback.count(),
        // Feedback by type
        prisma.betaFeedback.groupBy({
          by: ['type'],
          _count: true,
        }),
        // Average NPS score
        prisma.betaFeedback.aggregate({
          where: { npsScore: { not: null } },
          _avg: { npsScore: true },
        }),
        // Recent activity (last 7 days)
        prisma.betaTester.count({
          where: {
            lastActiveAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      res.json({
        applications: {
          total: totalApplications,
          byStatus: applicationsByStatus.map((a) => ({
            status: a.status,
            count: a._count,
          })),
        },
        testers: {
          total: totalTesters,
          byStatus: testersByStatus.map((t) => ({
            status: t.status,
            count: t._count,
          })),
          byCohort: testersByCohort.map((t) => ({
            cohort: t.cohort || 'unassigned',
            count: t._count,
          })),
          activeLastWeek: recentActivity,
        },
        feedback: {
          total: feedbackCount,
          byType: feedbackByType.map((f) => ({
            type: f.type,
            count: f._count,
          })),
          averageNps: avgNpsScore._avg.npsScore,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Feature Flag Management
  async createFeature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, isEnabled, rolloutPercentage, allowedCohorts, allowedUsers, metadata } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Feature name is required' });
        return;
      }

      const feature = await prisma.betaFeature.create({
        data: {
          name,
          description,
          isEnabled: isEnabled || false,
          rolloutPercentage: rolloutPercentage || 0,
          allowedCohorts: allowedCohorts || [],
          allowedUsers: allowedUsers || [],
          metadata,
        },
      });

      res.status(201).json({
        message: 'Feature created',
        feature,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFeatures(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const features = await prisma.betaFeature.findMany({
        orderBy: { createdAt: 'desc' },
      });

      res.json({ features });
    } catch (error) {
      next(error);
    }
  }

  async updateFeature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, isEnabled, rolloutPercentage, allowedCohorts, allowedUsers, metadata } = req.body;

      const feature = await prisma.betaFeature.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(isEnabled !== undefined && { isEnabled }),
          ...(rolloutPercentage !== undefined && { rolloutPercentage }),
          ...(allowedCohorts && { allowedCohorts }),
          ...(allowedUsers && { allowedUsers }),
          ...(metadata !== undefined && { metadata }),
        },
      });

      res.json({
        message: 'Feature updated',
        feature,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFeature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      await prisma.betaFeature.delete({ where: { id } });

      res.json({ message: 'Feature deleted' });
    } catch (error) {
      next(error);
    }
  }

  // Helper method for consistent feature flag hashing
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
