# SSC-17: Analytics & Progress Tracking Dashboard - Implementation Plan

## Overview

Build a comprehensive analytics dashboard that shows students their learning progress, strengths, weaknesses, and study patterns. This is a PREMIUM feature that requires PREMIUM+ subscription tier.

## Tech Stack
- **Backend**: Express.js + Prisma
- **Frontend**: Next.js 14 (App Router)
- **Database**: PostgreSQL
- **Charts**: Recharts (React charting library)
- **Export**: jsPDF + xlsx for report exports

## Current State Analysis

### What Already Exists
- **Database Models**:
  - `StudySession` - tracks flashcard study sessions with duration, cards studied, accuracy
  - `QuizAttempt` - tracks quiz attempts with score, time spent
  - `Flashcard` - has spaced repetition fields (timesReviewed, correctCount, lastReviewed, nextReview)
  - `AnalyticsEvent` - comprehensive event tracking (page views, feature usage, etc.)
- **Frontend**:
  - `apps/web/src/app/(dashboard)/analytics/page.tsx` - Placeholder page with mock data
  - StatCard, SimpleBarChart, ActivityHeatmap, SubjectPerformance components
- **Feature Gating**:
  - Analytics is set to `false` for FREE tier, `true` for PREMIUM+ in `config/pricing.ts`
  - `requireSubscription()` middleware available for route protection

### What Needs to Be Built
1. Backend analytics service with data aggregation
2. Analytics API endpoints
3. Real data integration in frontend (replacing mock data)
4. Advanced visualizations (Recharts integration)
5. Study streak tracking system
6. Weak area identification algorithm
7. Predictive analytics for exam readiness
8. Progress report export functionality

## Implementation Stages (20 Atomic Commits)

### Phase 1: Database Schema Updates (Commits 1-3)

**Commit 1**: Add study streak tracking to User model
```prisma
model User {
  // ... existing fields
  currentStreak     Int       @default(0)
  longestStreak     Int       @default(0)
  lastStudyDate     DateTime?
  totalStudyTime    Int       @default(0)  // Total minutes studied
}
```

**Commit 2**: Create UserAchievement model for badges/milestones
```prisma
model UserAchievement {
  id                String    @id @default(cuid())
  userId            String
  achievementType   AchievementType
  achievementName   String
  unlockedAt        DateTime  @default(now())
  metadata          Json?     // Additional data (e.g., streak count, cards mastered)

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, achievementType, achievementName])
  @@index([userId])
}

enum AchievementType {
  STREAK           // 7-day, 30-day, etc.
  MASTERY          // 100 cards, 500 cards mastered
  QUIZ_SCORE       // Perfect quiz, 90%+ accuracy
  STUDY_TIME       // 10 hours, 100 hours studied
  CONSISTENCY      // Early bird, night owl
  MILESTONE        // First quiz, first flashcard set
}
```

**Commit 3**: Add topic/tag-based analytics fields to StudySession
```prisma
model StudySession {
  // ... existing fields
  tags              String[]   // Copy tags from flashcard set for analytics
  topicAccuracy     Json?      // { "topic1": 0.85, "topic2": 0.72 }
}
```

### Phase 2: Backend - Analytics Service (Commits 4-8)

**Commit 4**: Create analytics service with overview stats
- Create `apps/api/src/services/analytics.service.ts`
- Functions:
  - `getOverviewStats(userId, timeRange)` - returns study time, cards reviewed, quizzes taken, accuracy
  - `getStudyTimeByDay(userId, timeRange)` - returns daily study minutes for chart
  - `calculateStreak(userId)` - updates and returns current streak

**Commit 5**: Add topic mastery analytics
- Functions:
  - `getTopicMastery(userId)` - returns mastery percentage per topic/tag
  - `getWeakAreas(userId)` - identifies topics with low accuracy or few reviews
  - `getStrongAreas(userId)` - identifies topics with high accuracy

**Commit 6**: Add quiz analytics functions
- Functions:
  - `getQuizPerformance(userId, timeRange)` - quiz scores over time
  - `getQuizAccuracyByTopic(userId)` - accuracy breakdown by topic
  - `getQuestionTypePerformance(userId)` - performance by MCQ, T/F, etc.

**Commit 7**: Add flashcard analytics functions
- Functions:
  - `getFlashcardRetention(userId)` - spaced repetition effectiveness
  - `getCardsDueForReview(userId)` - upcoming review schedule
  - `getMasteryProgress(userId)` - cards mastered vs total

**Commit 8**: Add predictive analytics functions
- Functions:
  - `predictExamReadiness(userId, topicId?)` - estimate exam preparedness
  - `getStudyRecommendations(userId)` - AI-generated study suggestions
  - `getOptimalStudyTime(userId)` - best time of day based on performance

### Phase 3: Backend - Achievement System (Commits 9-10)

**Commit 9**: Create achievement service
- Create `apps/api/src/services/achievement.service.ts`
- Functions:
  - `checkAndUnlockAchievements(userId)` - runs after study sessions
  - `getUnlockedAchievements(userId)` - returns all unlocked badges
  - `getAvailableAchievements()` - returns all possible achievements
  - `getAchievementProgress(userId)` - shows progress toward locked achievements

**Commit 10**: Define achievement definitions and unlock logic
- Define all achievements:
  - Streak achievements: 7-day, 14-day, 30-day, 100-day
  - Mastery achievements: 50 cards, 100 cards, 500 cards, 1000 cards mastered
  - Quiz achievements: First quiz, Perfect quiz, 10 perfect quizzes
  - Study time: 1 hour, 10 hours, 100 hours, 500 hours
  - Consistency: Early bird (before 8am), Night owl (after 10pm)

### Phase 4: Backend - API Endpoints (Commits 11-13)

**Commit 11**: Create analytics controller
- Create `apps/api/src/controllers/analytics.controller.ts`
- Methods:
  - `getOverview` - overview stats with trends
  - `getStudyTime` - study time chart data
  - `getTopicMastery` - topic mastery breakdown
  - `getWeakAreas` - areas needing improvement

**Commit 12**: Add more analytics endpoints to controller
- Methods:
  - `getQuizAnalytics` - quiz performance data
  - `getFlashcardAnalytics` - flashcard retention data
  - `getActivityHeatmap` - study activity calendar data
  - `getPredictions` - exam readiness predictions

**Commit 13**: Create analytics routes with subscription middleware
- Create `apps/api/src/routes/analytics.routes.ts`
- All routes require PREMIUM+ subscription
- Wire up all endpoints to controller
- Add to main app.ts

```typescript
// Analytics API Endpoints
GET    /api/analytics/overview          - Get overview stats (protected, premium)
GET    /api/analytics/study-time        - Get study time data (protected, premium)
GET    /api/analytics/topics            - Get topic mastery (protected, premium)
GET    /api/analytics/weak-areas        - Get weak areas (protected, premium)
GET    /api/analytics/quizzes           - Get quiz analytics (protected, premium)
GET    /api/analytics/flashcards        - Get flashcard analytics (protected, premium)
GET    /api/analytics/activity          - Get activity heatmap (protected, premium)
GET    /api/analytics/predictions       - Get predictions (protected, premium)
GET    /api/analytics/achievements      - Get achievements (protected, premium)
POST   /api/analytics/export            - Export progress report (protected, premium)
```

### Phase 5: Frontend - API Integration (Commits 14-15)

**Commit 14**: Create analytics API client
- Create `apps/web/src/lib/analytics-api.ts`
- Functions for all analytics endpoints
- Type definitions for all response data

```typescript
// apps/web/src/lib/analytics-api.ts
export interface OverviewStats {
  studyTime: { total: number; trend: number };
  cardsReviewed: { total: number; trend: number };
  quizzesTaken: { total: number; trend: number };
  averageAccuracy: { value: number; trend: number };
  currentStreak: number;
  longestStreak: number;
}

export interface TopicMastery {
  topic: string;
  mastery: number; // 0-100
  cardsStudied: number;
  accuracy: number;
  trend: 'up' | 'down' | 'stable';
}

export interface StudyTimeData {
  date: string;
  minutes: number;
}

export interface WeakArea {
  topic: string;
  accuracy: number;
  suggestion: string;
}

export async function getOverviewStats(timeRange: string): Promise<OverviewStats>;
export async function getStudyTimeData(timeRange: string): Promise<StudyTimeData[]>;
export async function getTopicMastery(): Promise<TopicMastery[]>;
export async function getWeakAreas(): Promise<WeakArea[]>;
// ... etc
```

**Commit 15**: Create analytics context provider
- Create `apps/web/src/contexts/analytics-context.tsx`
- Provides analytics data to all dashboard components
- Handles loading states and caching
- Refreshes data on time range change

### Phase 6: Frontend - Chart Components (Commits 16-17)

**Commit 16**: Install Recharts and create base chart components
- Add `recharts` package
- Create `apps/web/src/components/analytics/charts/`
  - `StudyTimeChart.tsx` - Line/Area chart for study time
  - `TopicMasteryRadar.tsx` - Radar chart for topic mastery
  - `AccuracyTrendChart.tsx` - Line chart for accuracy over time

**Commit 17**: Create additional visualization components
- Create:
  - `ActivityCalendar.tsx` - GitHub-style heatmap with real data
  - `QuizPerformanceChart.tsx` - Bar chart for quiz scores
  - `FlashcardRetentionChart.tsx` - Stacked area for retention curve
  - `PredictionGauge.tsx` - Gauge chart for exam readiness

### Phase 7: Frontend - Analytics Page Rewrite (Commits 18-19)

**Commit 18**: Rewrite analytics page with real data integration
- Update `apps/web/src/app/(dashboard)/analytics/page.tsx`
- Replace mock data with API calls via context
- Add loading skeletons
- Add error handling
- Implement time range filtering (week, month, quarter, year)

**Commit 19**: Add achievements section to analytics page
- Display unlocked achievements as badges
- Show progress toward locked achievements
- Celebrate new unlocks with animation

### Phase 8: Export & Polish (Commit 20)

**Commit 20**: Implement progress report export
- Create `apps/web/src/lib/report-generator.ts`
- PDF export with:
  - Overview stats
  - Topic mastery breakdown
  - Study time chart
  - Achievements
  - Recommendations
- Excel export option for data analysis
- Add export buttons to analytics page

## API Endpoints Detail

### Analytics Endpoints

```
GET /api/analytics/overview
Query: ?timeRange=week|month|quarter|year
Response: {
  studyTime: { total: 765, trend: 12 },
  cardsReviewed: { total: 342, trend: 8 },
  quizzesTaken: { total: 8, trend: 15 },
  averageAccuracy: { value: 78, trend: 5 },
  currentStreak: 14,
  longestStreak: 21
}

GET /api/analytics/study-time
Query: ?timeRange=week|month|quarter|year
Response: {
  data: [
    { date: "2024-01-01", minutes: 45 },
    { date: "2024-01-02", minutes: 60 },
    ...
  ]
}

GET /api/analytics/topics
Response: {
  topics: [
    {
      name: "Biology",
      mastery: 85,
      cardsStudied: 120,
      accuracy: 88,
      trend: "up"
    },
    ...
  ]
}

GET /api/analytics/weak-areas
Response: {
  areas: [
    {
      topic: "Chemistry",
      accuracy: 62,
      cardsNeededReview: 45,
      suggestion: "Focus on organic chemistry reactions"
    },
    ...
  ]
}

GET /api/analytics/quizzes
Query: ?timeRange=week|month|quarter|year
Response: {
  quizzes: [
    { date: "2024-01-01", score: 85, quizId: "..." },
    ...
  ],
  averageScore: 78,
  topTopics: ["Biology", "Math"],
  weakTopics: ["Chemistry"]
}

GET /api/analytics/flashcards
Response: {
  totalCards: 500,
  mastered: 320,
  learning: 130,
  new: 50,
  retentionRate: 85,
  dueToday: 25,
  dueThisWeek: 89
}

GET /api/analytics/activity
Query: ?weeks=7
Response: {
  activity: [
    [0, 2, 1, 3, 0, 4, 2], // Week 1, Mon-Sun
    [1, 3, 2, 1, 4, 3, 1], // Week 2
    ...
  ]
}

GET /api/analytics/predictions
Response: {
  examReadiness: 72, // Percentage
  recommendedTopics: ["Chemistry", "Physics"],
  estimatedGrade: "B+",
  confidence: 0.78,
  suggestions: [
    "Review Chemistry chapter 5",
    "Complete more Physics practice quizzes"
  ]
}

GET /api/analytics/achievements
Response: {
  unlocked: [
    { type: "STREAK", name: "7-Day Streak", unlockedAt: "...", icon: "flame" },
    { type: "MASTERY", name: "100 Cards Mastered", unlockedAt: "...", icon: "brain" },
    ...
  ],
  progress: [
    { type: "STREAK", name: "30-Day Streak", current: 14, target: 30, icon: "flame" },
    { type: "MASTERY", name: "500 Cards Mastered", current: 320, target: 500, icon: "brain" },
    ...
  ]
}

POST /api/analytics/export
Body: { format: "pdf" | "xlsx", timeRange: "week" | "month" | "quarter" | "year" }
Response: { downloadUrl: "...", expiresAt: "..." }
```

## Database Schema Changes

### User Model Updates
```prisma
model User {
  // ... existing fields
  currentStreak     Int       @default(0)
  longestStreak     Int       @default(0)
  lastStudyDate     DateTime?
  totalStudyTime    Int       @default(0)  // Total minutes studied

  // Relations
  achievements      UserAchievement[]
}
```

### New Models
```prisma
model UserAchievement {
  id                String    @id @default(cuid())
  userId            String
  achievementType   AchievementType
  achievementName   String
  unlockedAt        DateTime  @default(now())
  metadata          Json?

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, achievementType, achievementName])
  @@index([userId])
}

enum AchievementType {
  STREAK
  MASTERY
  QUIZ_SCORE
  STUDY_TIME
  CONSISTENCY
  MILESTONE
}
```

### StudySession Updates
```prisma
model StudySession {
  // ... existing fields
  tags              String[]
  topicAccuracy     Json?
}
```

## Component Structure

### Analytics Page Components
```
apps/web/src/app/(dashboard)/analytics/
├── page.tsx                    # Main analytics page
├── loading.tsx                 # Loading skeleton
└── error.tsx                   # Error boundary

apps/web/src/components/analytics/
├── OverviewStats.tsx           # Stats cards row
├── StudyTimeChart.tsx          # Study time visualization
├── TopicMasteryCard.tsx        # Topic mastery with progress bars
├── WeakAreasCard.tsx           # Areas needing improvement
├── ActivityHeatmap.tsx         # GitHub-style activity calendar
├── AchievementsGrid.tsx        # Achievements/badges display
├── StudyInsights.tsx           # AI-generated insights
├── ExportButton.tsx            # Export functionality
└── charts/
    ├── AreaChart.tsx           # Reusable area chart
    ├── RadarChart.tsx          # Topic mastery radar
    ├── GaugeChart.tsx          # Exam readiness gauge
    └── BarChart.tsx            # Quiz performance bars
```

## Feature Requirements Checklist

### Overview Dashboard
- [ ] Total study time with week-over-week trend
- [ ] Cards reviewed with trend
- [ ] Quizzes taken with trend
- [ ] Average accuracy with trend
- [ ] Current study streak display
- [ ] Longest streak record

### Study Time Tracking
- [ ] Daily study time chart (area/line)
- [ ] Weekly study time aggregation
- [ ] Monthly study time view
- [ ] Total cumulative study time

### Topic Mastery
- [ ] Mastery percentage per topic/tag
- [ ] Visual progress bars or radar chart
- [ ] Trend indicators (improving/declining)
- [ ] Cards studied per topic

### Weak Area Identification
- [ ] Algorithm to identify low-accuracy topics
- [ ] Recommendations for improvement
- [ ] Priority ranking by impact

### Quiz Analytics
- [ ] Quiz scores over time
- [ ] Performance by question type
- [ ] Topic-wise quiz accuracy
- [ ] Time spent per quiz

### Flashcard Analytics
- [ ] Spaced repetition effectiveness
- [ ] Retention rate calculation
- [ ] Due cards calendar
- [ ] Mastery distribution (new, learning, mastered)

### Activity Visualization
- [ ] GitHub-style heatmap calendar
- [ ] Session count per day
- [ ] Color intensity by activity level

### Achievements System
- [ ] Streak-based achievements (7, 14, 30, 100 days)
- [ ] Mastery achievements (50, 100, 500, 1000 cards)
- [ ] Quiz achievements (first quiz, perfect score)
- [ ] Study time achievements (10h, 100h, 500h)
- [ ] Achievement unlock notifications

### Predictive Analytics
- [ ] Exam readiness score
- [ ] Estimated grade prediction
- [ ] Topic priority recommendations
- [ ] Optimal study time suggestions

### Export Functionality
- [ ] PDF progress report
- [ ] Excel data export
- [ ] Shareable summary image (future)

### Premium Gating
- [ ] Feature gated for PREMIUM+ tiers
- [ ] Upgrade prompts for FREE users
- [ ] Preview/teaser for FREE users

## Code Implementation Examples

### Analytics Service Example
```typescript
// apps/api/src/services/analytics.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalyticsService {
  /**
   * Get overview statistics for a user
   */
  async getOverviewStats(userId: string, timeRange: string) {
    const now = new Date();
    const startDate = this.getStartDate(now, timeRange);
    const previousStartDate = this.getStartDate(startDate, timeRange);

    // Current period stats
    const studySessions = await prisma.studySession.findMany({
      where: {
        userId,
        startedAt: { gte: startDate },
      },
    });

    const quizAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        startedAt: { gte: startDate },
        completed: true,
      },
    });

    // Previous period for trends
    const previousStudySessions = await prisma.studySession.findMany({
      where: {
        userId,
        startedAt: { gte: previousStartDate, lt: startDate },
      },
    });

    // Calculate stats
    const totalStudyTime = studySessions.reduce((sum, s) => sum + s.duration, 0);
    const previousStudyTime = previousStudySessions.reduce((sum, s) => sum + s.duration, 0);
    const studyTimeTrend = this.calculateTrend(totalStudyTime, previousStudyTime);

    const cardsReviewed = studySessions.reduce((sum, s) => sum + s.cardsStudied, 0);
    const averageAccuracy = studySessions.length > 0
      ? studySessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / studySessions.length
      : 0;

    // Get streak
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true },
    });

    return {
      studyTime: {
        total: Math.round(totalStudyTime / 60), // Convert to minutes
        trend: studyTimeTrend,
      },
      cardsReviewed: {
        total: cardsReviewed,
        trend: 0, // Calculate similarly
      },
      quizzesTaken: {
        total: quizAttempts.length,
        trend: 0,
      },
      averageAccuracy: {
        value: Math.round(averageAccuracy * 100) / 100,
        trend: 0,
      },
      currentStreak: user?.currentStreak || 0,
      longestStreak: user?.longestStreak || 0,
    };
  }

  /**
   * Calculate study streak
   */
  async updateStreak(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastStudyDate: true, currentStreak: true, longestStreak: true },
    });

    if (!user) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastStudy = user.lastStudyDate ? new Date(user.lastStudyDate) : null;
    lastStudy?.setHours(0, 0, 0, 0);

    let newStreak = user.currentStreak;

    if (!lastStudy) {
      // First study session
      newStreak = 1;
    } else {
      const diffDays = Math.floor((today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day, streak unchanged
        newStreak = user.currentStreak;
      } else if (diffDays === 1) {
        // Consecutive day, increment streak
        newStreak = user.currentStreak + 1;
      } else {
        // Streak broken, reset to 1
        newStreak = 1;
      }
    }

    const longestStreak = Math.max(newStreak, user.longestStreak);

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak,
        lastStudyDate: new Date(),
      },
    });

    return newStreak;
  }

  /**
   * Get topic mastery breakdown
   */
  async getTopicMastery(userId: string) {
    // Get all flashcard sets with their tags
    const flashcardSets = await prisma.flashcardSet.findMany({
      where: { userId },
      include: {
        flashcards: {
          select: {
            timesReviewed: true,
            correctCount: true,
            difficulty: true,
          },
        },
      },
    });

    // Aggregate by tag
    const topicStats: Record<string, {
      cardsStudied: number;
      totalCorrect: number;
      totalReviews: number;
    }> = {};

    for (const set of flashcardSets) {
      for (const tag of set.tags) {
        if (!topicStats[tag]) {
          topicStats[tag] = { cardsStudied: 0, totalCorrect: 0, totalReviews: 0 };
        }

        for (const card of set.flashcards) {
          topicStats[tag].cardsStudied++;
          topicStats[tag].totalCorrect += card.correctCount;
          topicStats[tag].totalReviews += card.timesReviewed;
        }
      }
    }

    // Calculate mastery for each topic
    const topics = Object.entries(topicStats).map(([name, stats]) => {
      const accuracy = stats.totalReviews > 0
        ? (stats.totalCorrect / stats.totalReviews) * 100
        : 0;

      // Mastery is a combination of accuracy and review count
      const reviewFactor = Math.min(stats.totalReviews / 100, 1); // Max out at 100 reviews
      const mastery = accuracy * reviewFactor;

      return {
        name,
        mastery: Math.round(mastery),
        cardsStudied: stats.cardsStudied,
        accuracy: Math.round(accuracy),
        trend: 'stable' as const, // Would need historical data for real trend
      };
    });

    return topics.sort((a, b) => b.mastery - a.mastery);
  }

  /**
   * Get weak areas needing improvement
   */
  async getWeakAreas(userId: string) {
    const topics = await this.getTopicMastery(userId);

    return topics
      .filter(t => t.accuracy < 70) // Below 70% accuracy
      .map(t => ({
        topic: t.name,
        accuracy: t.accuracy,
        cardsNeededReview: t.cardsStudied,
        suggestion: this.generateSuggestion(t),
      }))
      .slice(0, 5); // Top 5 weak areas
  }

  private getStartDate(from: Date, timeRange: string): Date {
    const date = new Date(from);
    switch (timeRange) {
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'quarter':
        date.setMonth(date.getMonth() - 3);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - 1);
        break;
    }
    return date;
  }

  private calculateTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private generateSuggestion(topic: { name: string; accuracy: number; cardsStudied: number }): string {
    if (topic.accuracy < 50) {
      return `Review ${topic.name} fundamentals. Consider creating new flashcards for key concepts.`;
    } else if (topic.accuracy < 70) {
      return `Practice ${topic.name} more frequently. Focus on the cards you're getting wrong.`;
    }
    return `Good progress on ${topic.name}! Keep reviewing to maintain mastery.`;
  }
}

export const analyticsService = new AnalyticsService();
```

### Analytics Controller Example
```typescript
// apps/api/src/controllers/analytics.controller.ts
import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { achievementService } from '../services/achievement.service';

export class AnalyticsController {
  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const timeRange = (req.query.timeRange as string) || 'week';

      const stats = await analyticsService.getOverviewStats(userId, timeRange);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getStudyTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const timeRange = (req.query.timeRange as string) || 'week';

      const data = await analyticsService.getStudyTimeByDay(userId, timeRange);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  async getTopicMastery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const topics = await analyticsService.getTopicMastery(userId);
      res.json({ topics });
    } catch (error) {
      next(error);
    }
  }

  async getWeakAreas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const areas = await analyticsService.getWeakAreas(userId);
      res.json({ areas });
    } catch (error) {
      next(error);
    }
  }

  async getAchievements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const unlocked = await achievementService.getUnlockedAchievements(userId);
      const progress = await achievementService.getAchievementProgress(userId);

      res.json({ unlocked, progress });
    } catch (error) {
      next(error);
    }
  }

  async exportReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { format, timeRange } = req.body;

      // Generate report and upload to storage
      const downloadUrl = await analyticsService.generateReport(userId, format, timeRange);

      res.json({
        downloadUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### Frontend API Client Example
```typescript
// apps/web/src/lib/analytics-api.ts
import { apiClient } from './api-client';

export interface OverviewStats {
  studyTime: { total: number; trend: number };
  cardsReviewed: { total: number; trend: number };
  quizzesTaken: { total: number; trend: number };
  averageAccuracy: { value: number; trend: number };
  currentStreak: number;
  longestStreak: number;
}

export interface TopicMastery {
  name: string;
  mastery: number;
  cardsStudied: number;
  accuracy: number;
  trend: 'up' | 'down' | 'stable';
}

export interface WeakArea {
  topic: string;
  accuracy: number;
  cardsNeededReview: number;
  suggestion: string;
}

export interface Achievement {
  type: string;
  name: string;
  unlockedAt?: string;
  icon: string;
  current?: number;
  target?: number;
}

export async function getOverviewStats(timeRange: string): Promise<OverviewStats> {
  const response = await apiClient.get(`/analytics/overview?timeRange=${timeRange}`);
  return response.data;
}

export async function getStudyTimeData(timeRange: string): Promise<{ date: string; minutes: number }[]> {
  const response = await apiClient.get(`/analytics/study-time?timeRange=${timeRange}`);
  return response.data.data;
}

export async function getTopicMastery(): Promise<TopicMastery[]> {
  const response = await apiClient.get('/analytics/topics');
  return response.data.topics;
}

export async function getWeakAreas(): Promise<WeakArea[]> {
  const response = await apiClient.get('/analytics/weak-areas');
  return response.data.areas;
}

export async function getAchievements(): Promise<{
  unlocked: Achievement[];
  progress: Achievement[];
}> {
  const response = await apiClient.get('/analytics/achievements');
  return response.data;
}

export async function exportReport(format: 'pdf' | 'xlsx', timeRange: string): Promise<string> {
  const response = await apiClient.post('/analytics/export', { format, timeRange });
  return response.data.downloadUrl;
}
```

### Recharts Component Example
```tsx
// apps/web/src/components/analytics/charts/StudyTimeChart.tsx
"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface StudyTimeChartProps {
  data: { date: string; minutes: number }[];
}

export function StudyTimeChart({ data }: StudyTimeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={(value) => `${value}m`}
          className="text-muted-foreground"
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-medium">
                    {new Date(label).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-primary">
                    {payload[0].value} minutes studied
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="minutes"
          stroke="hsl(var(--primary))"
          fillOpacity={1}
          fill="url(#colorMinutes)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

## Dependencies to Install

### Backend (apps/api)
```bash
# No new dependencies needed - using existing Prisma
```

### Frontend (apps/web)
```bash
npm install recharts --workspace=@studysync/web
npm install jspdf jspdf-autotable --workspace=@studysync/web
npm install xlsx --workspace=@studysync/web
```

## Testing Strategy

### Unit Tests
- Analytics service calculation functions
- Streak calculation edge cases
- Achievement unlock logic
- Trend calculation accuracy

### Integration Tests
- API endpoints return correct data
- Subscription middleware blocks FREE users
- Export generates valid files

### E2E Tests
- Analytics page loads with real data
- Time range filtering works
- Export downloads file
- Achievements unlock properly

## Success Criteria

- [ ] All 20 commits completed and passing CI
- [ ] Analytics page shows real user data
- [ ] Time range filtering works correctly
- [ ] Study streak updates automatically after study sessions
- [ ] Achievement system unlocks badges at correct thresholds
- [ ] Topic mastery calculation is accurate
- [ ] Weak areas are correctly identified
- [ ] PDF and Excel exports generate correctly
- [ ] Page loads in <2 seconds
- [ ] Mobile-responsive design works
- [ ] Feature gated properly for PREMIUM+ users
- [ ] Upgrade prompts show for FREE users

## Integration with Existing Features

### After Study Sessions
Update `flashcard.controller.ts` to:
1. Call `analyticsService.updateStreak(userId)` after session ends
2. Call `achievementService.checkAndUnlockAchievements(userId)`

### After Quiz Completion
Update `quiz.controller.ts` to:
1. Call `analyticsService.recordQuizCompletion(userId, quizId, score)`
2. Call `achievementService.checkAndUnlockAchievements(userId)`

### Subscription Context
The analytics page should:
1. Check if user has PREMIUM+ subscription
2. Show upgrade prompt if FREE user
3. Allow preview of analytics with blurred/limited data

## Future Enhancements

1. **Social Features**: Compare with friends/classmates
2. **Study Groups**: Group analytics and leaderboards
3. **AI Insights**: GPT-powered study recommendations
4. **Calendar Integration**: Schedule study sessions
5. **Goal Setting**: Set and track study goals
6. **Notifications**: Daily/weekly progress summaries

## Notes

- Analytics are computed on-demand, not pre-aggregated (may need optimization for scale)
- Streak resets at midnight in user's timezone (future: add timezone support)
- Export files stored temporarily in MinIO with 24-hour expiration
- All analytics require authentication and appropriate subscription tier
- Consider adding Redis caching for frequently accessed analytics
