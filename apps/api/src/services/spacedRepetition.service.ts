import { Difficulty } from '@prisma/client';

/**
 * SM-2 Spaced Repetition Algorithm Implementation
 *
 * Quality ratings (0-5):
 * 0 - Complete blackout, no recall
 * 1 - Incorrect response, but upon seeing correct answer, remembered
 * 2 - Incorrect response, but correct answer seemed easy to recall
 * 3 - Correct response with serious difficulty
 * 4 - Correct response after hesitation
 * 5 - Perfect response with no hesitation
 *
 * Quality >= 3 is considered a "correct" answer
 */

export type ReviewResult = 0 | 1 | 2 | 3 | 4 | 5;

export interface FlashcardData {
  difficulty: Difficulty;
  timesReviewed: number;
  correctCount: number;
  lastReviewed: Date | null;
  nextReview: Date | null;
}

export interface ReviewCalculation {
  nextReview: Date;
  intervalDays: number;
  newDifficulty: Difficulty;
  easeFactor: number;
}

// Default ease factors for each difficulty level
const DIFFICULTY_EASE_FACTORS: Record<Difficulty, number> = {
  EASY: 2.8,
  MEDIUM: 2.5,
  HARD: 2.0,
};

// Minimum ease factor (prevents intervals from becoming too short)
const MIN_EASE_FACTOR = 1.3;

// Maximum interval in days
const MAX_INTERVAL_DAYS = 365;

export class SpacedRepetitionService {
  /**
   * Calculate the next review date based on SM-2 algorithm
   */
  calculateNextReview(
    card: FlashcardData,
    quality: ReviewResult
  ): ReviewCalculation {
    // Get current ease factor based on difficulty
    let easeFactor = DIFFICULTY_EASE_FACTORS[card.difficulty];

    // Calculate current interval (days since last review, or 0 if never reviewed)
    const currentInterval = this.getCurrentInterval(card);

    // Determine if this is a new card or a review
    const isFirstReview = card.timesReviewed === 0;

    // Calculate new ease factor using SM-2 formula
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor + efDelta);

    // Calculate new interval
    let newInterval: number;

    if (quality < 3) {
      // Incorrect response - reset to beginning
      newInterval = 1;
    } else if (isFirstReview) {
      // First successful review
      newInterval = 1;
    } else if (card.timesReviewed === 1 || currentInterval <= 1) {
      // Second review or recovering from reset
      newInterval = 6;
    } else {
      // Subsequent reviews - multiply by ease factor
      newInterval = Math.round(currentInterval * easeFactor);
    }

    // Apply bounds
    newInterval = Math.min(newInterval, MAX_INTERVAL_DAYS);
    newInterval = Math.max(newInterval, 1);

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);
    nextReview.setHours(0, 0, 0, 0); // Normalize to start of day

    // Determine new difficulty based on performance
    const newDifficulty = this.calculateNewDifficulty(card, quality);

    return {
      nextReview,
      intervalDays: newInterval,
      newDifficulty,
      easeFactor,
    };
  }

  /**
   * Get the current interval in days
   */
  private getCurrentInterval(card: FlashcardData): number {
    if (!card.lastReviewed || !card.nextReview) {
      return 0;
    }

    // Calculate the planned interval (difference between next and last review)
    const diffMs = card.nextReview.getTime() - card.lastReviewed.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(1, diffDays);
  }

  /**
   * Calculate new difficulty based on performance history
   */
  private calculateNewDifficulty(
    card: FlashcardData,
    quality: ReviewResult
  ): Difficulty {
    const currentDifficulty = card.difficulty;

    // Calculate success rate
    const totalReviews = card.timesReviewed + 1;
    const correctReviews = card.correctCount + (quality >= 3 ? 1 : 0);
    const successRate = correctReviews / totalReviews;

    // Need at least 3 reviews before adjusting difficulty
    if (totalReviews < 3) {
      return currentDifficulty;
    }

    // Adjust difficulty based on success rate
    if (successRate >= 0.9 && currentDifficulty !== 'EASY') {
      // Very high success rate - make easier
      return currentDifficulty === 'HARD' ? 'MEDIUM' : 'EASY';
    } else if (successRate < 0.5 && currentDifficulty !== 'HARD') {
      // Low success rate - make harder
      return currentDifficulty === 'EASY' ? 'MEDIUM' : 'HARD';
    } else if (quality <= 1 && currentDifficulty !== 'HARD') {
      // Complete failure - increase difficulty
      return currentDifficulty === 'EASY' ? 'MEDIUM' : 'HARD';
    } else if (quality === 5 && currentDifficulty !== 'EASY' && successRate >= 0.8) {
      // Perfect response with good history - decrease difficulty
      return currentDifficulty === 'HARD' ? 'MEDIUM' : 'EASY';
    }

    return currentDifficulty;
  }

  /**
   * Get recommended daily study count based on user stats
   */
  getRecommendedDailyCount(stats: {
    totalCards: number;
    averageAccuracy: number;
    averageSessionLength: number; // in minutes
  }): { newCards: number; reviewCards: number } {
    const { totalCards, averageAccuracy, averageSessionLength } = stats;

    // Base recommendation: 20 new cards + reviews
    let newCards = 20;
    let reviewCards = 50;

    // Adjust based on accuracy (lower accuracy = fewer new cards)
    if (averageAccuracy < 0.6) {
      newCards = 10;
      reviewCards = 30;
    } else if (averageAccuracy < 0.8) {
      newCards = 15;
      reviewCards = 40;
    }

    // Adjust based on session length preference
    if (averageSessionLength < 10) {
      newCards = Math.min(newCards, 10);
      reviewCards = Math.min(reviewCards, 20);
    } else if (averageSessionLength > 30) {
      newCards = Math.min(newCards + 10, 30);
      reviewCards = Math.min(reviewCards + 20, 100);
    }

    // Don't exceed total available cards
    newCards = Math.min(newCards, totalCards);

    return { newCards, reviewCards };
  }

  /**
   * Calculate optimal study order for a set of cards
   */
  getStudyOrder(cards: Array<FlashcardData & { id: string }>): string[] {
    const now = new Date();

    // Separate cards into categories
    const overdue: typeof cards = [];
    const dueToday: typeof cards = [];
    const newCards: typeof cards = [];

    for (const card of cards) {
      if (!card.nextReview || card.timesReviewed === 0) {
        newCards.push(card);
      } else if (card.nextReview <= now) {
        const overdueDays = Math.floor(
          (now.getTime() - card.nextReview.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (overdueDays > 0) {
          overdue.push(card);
        } else {
          dueToday.push(card);
        }
      }
    }

    // Sort overdue by how overdue they are (most overdue first)
    overdue.sort((a, b) => {
      const aOverdue = now.getTime() - (a.nextReview?.getTime() || 0);
      const bOverdue = now.getTime() - (b.nextReview?.getTime() || 0);
      return bOverdue - aOverdue;
    });

    // Sort due today by difficulty (harder cards first for freshness)
    dueToday.sort((a, b) => {
      const difficultyOrder = { HARD: 0, MEDIUM: 1, EASY: 2 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });

    // Interleave new cards with reviews (1 new per 3 reviews)
    const result: string[] = [];
    let newIndex = 0;

    // First, handle overdue cards
    for (const card of overdue) {
      result.push(card.id);
    }

    // Then interleave due today with new cards
    for (let i = 0; i < dueToday.length; i++) {
      result.push(dueToday[i].id);

      // Insert a new card every 3 reviews
      if ((i + 1) % 3 === 0 && newIndex < newCards.length) {
        result.push(newCards[newIndex].id);
        newIndex++;
      }
    }

    // Add remaining new cards at the end
    while (newIndex < newCards.length) {
      result.push(newCards[newIndex].id);
      newIndex++;
    }

    return result;
  }

  /**
   * Predict mastery date for a card
   */
  predictMasteryDate(card: FlashcardData): Date | null {
    // Consider "mastered" when card has been reviewed 5+ times with 80%+ accuracy
    const reviewsNeeded = Math.max(0, 5 - card.timesReviewed);
    const currentAccuracy = card.timesReviewed > 0
      ? card.correctCount / card.timesReviewed
      : 0.5; // Assume 50% for new cards

    if (card.timesReviewed >= 5 && currentAccuracy >= 0.8) {
      // Already mastered
      return new Date();
    }

    // Estimate reviews needed based on current performance
    const estimatedReviewsNeeded = currentAccuracy >= 0.8
      ? reviewsNeeded
      : Math.ceil(reviewsNeeded * 1.5);

    // Calculate based on typical interval progression
    // Day 1, 6, 15, 36, 90 (approximate SM-2 progression)
    const typicalProgression = [1, 6, 15, 36, 90];
    let totalDays = 0;

    for (let i = card.timesReviewed; i < Math.min(5, card.timesReviewed + estimatedReviewsNeeded); i++) {
      totalDays += typicalProgression[i] || typicalProgression[typicalProgression.length - 1];
    }

    const masteryDate = new Date();
    masteryDate.setDate(masteryDate.getDate() + totalDays);

    return masteryDate;
  }

  /**
   * Get study streak information
   */
  calculateStreak(
    sessions: Array<{ startedAt: Date; cardsStudied: number }>
  ): { currentStreak: number; longestStreak: number; lastStudyDate: Date | null } {
    if (sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
    }

    // Sort sessions by date (most recent first)
    const sortedSessions = [...sessions].sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
    );

    // Get unique study dates
    const studyDates = [...new Set(
      sortedSessions
        .filter(s => s.cardsStudied > 0)
        .map(s => s.startedAt.toISOString().split('T')[0])
    )].sort().reverse();

    if (studyDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
    }

    const lastStudyDate = new Date(studyDates[0]);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = studyDates[0];

    // Only count streak if last study was today or yesterday
    if (checkDate === today || checkDate === yesterday) {
      for (const date of studyDates) {
        if (date === checkDate) {
          currentStreak++;
          const prevDate = new Date(checkDate);
          prevDate.setDate(prevDate.getDate() - 1);
          checkDate = prevDate.toISOString().split('T')[0];
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < studyDates.length; i++) {
      const current = new Date(studyDates[i - 1]);
      const prev = new Date(studyDates[i]);
      const diffDays = Math.round((current.getTime() - prev.getTime()) / 86400000);

      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return { currentStreak, longestStreak, lastStudyDate };
  }
}

export const spacedRepetitionService = new SpacedRepetitionService();
