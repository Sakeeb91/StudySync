# SSC-14: Exam Content Prediction Engine - Implementation Plan

## Overview

Build an intelligent exam prediction system that analyzes lecture content, concept importance, professor emphasis patterns, and historical study data to predict likely exam content and generate focused study recommendations.

**This is a key differentiator feature for StudySync** - only available for STUDENT_PLUS and UNIVERSITY tiers.

## Tech Stack
- **Backend**: Express.js + Prisma + OpenAI GPT-4
- **Frontend**: Next.js 14 (App Router)
- **Database**: PostgreSQL
- **AI**: OpenAI for prediction analysis, embeddings for concept similarity
- **Visualization**: Recharts for prediction displays

## Current State Analysis

### What Already Exists
- **Knowledge Graph**:
  - `Concept` model with `importance` scores (0-1), `entityType`, `embedding`
  - `ConceptRelationship` with `PREREQUISITE`, `RELATED`, and other relationship types
  - `conceptExtractionService` - AI-powered concept extraction from uploads
  - `embeddingService` - semantic search and similarity calculations
- **Study Tracking**:
  - `StudySession` - tracks flashcard study with duration, accuracy
  - `QuizAttempt` - tracks quiz scores, time spent, answers
  - `Flashcard` - spaced repetition with `correctCount`, `timesReviewed`
- **Quiz Generation**:
  - `quizGenerationService` - AI-generated questions with topics, difficulty
- **Feature Gating**:
  - `examPrediction: false` for FREE/PREMIUM, `true` for STUDENT_PLUS/UNIVERSITY

### What Needs to Be Built
1. Exam prediction service with topic probability scoring
2. Professor emphasis detection from lecture patterns
3. Historical exam pattern analysis (future: user-contributed)
4. Focused study plan generator
5. Exam readiness assessment
6. Post-exam feedback loop for accuracy improvement
7. Prediction dashboard UI

## Implementation Stages (18 Atomic Commits)

### Phase 1: Database Schema Updates (Commits 1-3)

**Commit 1**: Create ExamPrediction model
```prisma
model ExamPrediction {
  id                String    @id @default(cuid())
  userId            String
  title             String                    // "Midterm 1", "Final Exam"
  examDate          DateTime?                 // When the exam is scheduled
  courseContext     String?                   // Course name/description for context
  status            PredictionStatus @default(ACTIVE)
  overallReadiness  Float     @default(0)     // 0-100 readiness score
  generatedAt       DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  topicPredictions  TopicPrediction[]
  studyPlan         StudyPlan?
  actualExam        ActualExamResult?

  @@index([userId])
  @@index([status])
}

enum PredictionStatus {
  ACTIVE            // Currently active prediction
  COMPLETED         // Exam taken, feedback provided
  ARCHIVED          // Old prediction, no longer relevant
}
```

**Commit 2**: Create TopicPrediction model for individual topic predictions
```prisma
model TopicPrediction {
  id                  String    @id @default(cuid())
  examPredictionId    String
  conceptId           String?               // Link to knowledge graph concept
  topicName           String                // Topic name
  probability         Float                 // 0-100 likelihood of appearing
  confidence          Float     @default(0.7) // Confidence in prediction
  difficulty          String    @default("medium") // easy, medium, hard
  importanceScore     Float     @default(0.5)  // From concept importance
  emphasisScore       Float     @default(0.5)  // Professor emphasis detected
  studyStatus         StudyStatus @default(NOT_STARTED)
  currentMastery      Float     @default(0)    // 0-100 based on quiz/flashcard performance
  recommendedTime     Int       @default(60)   // Recommended study time in minutes
  reasoning           String?               // AI explanation for prediction

  examPrediction      ExamPrediction @relation(fields: [examPredictionId], references: [id], onDelete: Cascade)
  concept             Concept?   @relation(fields: [conceptId], references: [id], onDelete: SetNull)

  @@index([examPredictionId])
  @@index([probability])
}

enum StudyStatus {
  NOT_STARTED
  IN_PROGRESS
  NEEDS_REVIEW
  MASTERED
}
```

**Commit 3**: Create StudyPlan and ActualExamResult models
```prisma
model StudyPlan {
  id                  String    @id @default(cuid())
  examPredictionId    String    @unique
  totalStudyTime      Int                   // Total recommended minutes
  dailySchedule       Json                  // { "day1": [...topics], "day2": [...] }
  priorityOrder       String[]              // Topic IDs in priority order
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  examPrediction      ExamPrediction @relation(fields: [examPredictionId], references: [id], onDelete: Cascade)
}

model ActualExamResult {
  id                  String    @id @default(cuid())
  examPredictionId    String    @unique
  actualScore         Float?               // Actual exam score (optional)
  topicsAppeared      String[]             // Topics that actually appeared
  topicsMissed        String[]             // Predicted topics that didn't appear
  surpriseTopics      String[]             // Topics that appeared but weren't predicted
  feedbackNotes       String?              // User notes
  submittedAt         DateTime  @default(now())

  examPrediction      ExamPrediction @relation(fields: [examPredictionId], references: [id], onDelete: Cascade)
}

// Add relation to Concept model
model Concept {
  // ... existing fields
  topicPredictions    TopicPrediction[]
}

// Add relation to User model
model User {
  // ... existing fields
  examPredictions     ExamPrediction[]
}
```

### Phase 2: Backend - Prediction Service (Commits 4-8)

**Commit 4**: Create exam prediction service foundation
- Create `apps/api/src/services/examPrediction.service.ts`
- Functions:
  - `analyzeUploadForExam(userId, uploadId)` - Extract exam-relevant patterns
  - `getConceptImportanceScores(userId, uploadIds)` - Aggregate concept importance
  - `detectProfessorEmphasis(content)` - AI detection of emphasis patterns

**Commit 5**: Implement topic probability calculation
- Functions:
  - `calculateTopicProbabilities(concepts, options)` - Score topics by exam likelihood
  - `weightFactors(concept, studyData, quizData)` - Combine multiple signals
  - `generatePredictionReasoning(topic, factors)` - AI explanation generation

**Commit 6**: Implement study plan generation
- Functions:
  - `generateStudyPlan(prediction, daysUntilExam)` - Create prioritized study schedule
  - `calculateRecommendedTime(topic, mastery, importance)` - Time allocation
  - `prioritizeTopics(predictions)` - Sort by impact and weakness

**Commit 7**: Implement exam readiness assessment
- Functions:
  - `calculateOverallReadiness(prediction)` - Aggregate readiness score
  - `assessTopicMastery(userId, topicName)` - Check quiz/flashcard performance
  - `getReadinessBreakdown(prediction)` - Detailed readiness by topic

**Commit 8**: Implement feedback loop for accuracy improvement
- Functions:
  - `recordActualExamResult(predictionId, result)` - Store post-exam feedback
  - `calculatePredictionAccuracy(prediction, actual)` - Measure accuracy
  - `updatePredictionModel(feedbackData)` - Improve future predictions

### Phase 3: Backend - AI Analysis (Commits 9-10)

**Commit 9**: Create emphasis detection service
- Create `apps/api/src/services/emphasisDetection.service.ts`
- AI prompt to detect:
  - Repeated mentions of topics
  - Explicit importance indicators ("This will be on the exam", "Important concept")
  - Time spent on topics (estimated from content length)
  - Question type hints (essay topics, calculation-heavy areas)

```typescript
const EMPHASIS_DETECTION_PROMPT = `Analyze this lecture content and identify which topics the professor emphasizes as important for exams.

Look for these signals:
1. Explicit importance statements ("This is important", "Remember this", "This will be on the test")
2. Repeated mentions of the same concept
3. Detailed explanations vs brief mentions
4. Problem-solving examples and practice questions
5. Topics at the end of sections (often summarized)
6. Connections to previous exams or assignments

For each topic, provide:
- Topic name
- Emphasis score (0.0-1.0)
- Reasoning for the score
- Predicted question type (MCQ, essay, problem-solving, short-answer)
`;
```

**Commit 10**: Create exam pattern recognition service
- Functions:
  - `identifyExamPatterns(concepts, relationships)` - Pattern detection
  - `predictQuestionTypes(topic)` - What type of questions to expect
  - `estimateTopicDifficulty(topic, content)` - Difficulty prediction

### Phase 4: Backend - API Endpoints (Commits 11-13)

**Commit 11**: Create exam prediction controller
- Create `apps/api/src/controllers/examPrediction.controller.ts`
- Methods:
  - `createPrediction` - Generate new exam prediction
  - `getPredictions` - List user's predictions
  - `getPrediction` - Get specific prediction with details
  - `updatePrediction` - Refresh prediction with new data

**Commit 12**: Add study plan and readiness endpoints
- Methods:
  - `getStudyPlan` - Get/generate study plan
  - `updateStudyProgress` - Mark topics as studied
  - `getReadiness` - Get current readiness assessment
  - `getTopicRecommendations` - Get what to study next

**Commit 13**: Create routes and add feedback endpoints
- Create `apps/api/src/routes/examPrediction.routes.ts`
- Methods:
  - `submitExamFeedback` - Record actual exam results
  - `getPredictionAccuracy` - Get historical accuracy stats

```typescript
// Exam Prediction API Endpoints
POST   /api/predictions                    - Create new prediction (protected, STUDENT_PLUS+)
GET    /api/predictions                    - List user's predictions (protected, STUDENT_PLUS+)
GET    /api/predictions/:id                - Get prediction details (protected, STUDENT_PLUS+)
PUT    /api/predictions/:id                - Update prediction (protected, STUDENT_PLUS+)
DELETE /api/predictions/:id                - Delete prediction (protected, STUDENT_PLUS+)
GET    /api/predictions/:id/study-plan     - Get study plan (protected, STUDENT_PLUS+)
PUT    /api/predictions/:id/study-plan     - Update study progress (protected, STUDENT_PLUS+)
GET    /api/predictions/:id/readiness      - Get readiness assessment (protected, STUDENT_PLUS+)
POST   /api/predictions/:id/feedback       - Submit exam feedback (protected, STUDENT_PLUS+)
GET    /api/predictions/accuracy           - Get prediction accuracy stats (protected, STUDENT_PLUS+)
```

### Phase 5: Frontend - API Integration (Commits 14-15)

**Commit 14**: Create exam prediction API client
- Create `apps/web/src/lib/exam-prediction-api.ts`
- Type definitions for all endpoints
- Functions for API calls

```typescript
export interface ExamPrediction {
  id: string;
  title: string;
  examDate: string | null;
  overallReadiness: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  topicPredictions: TopicPrediction[];
  studyPlan: StudyPlan | null;
}

export interface TopicPrediction {
  id: string;
  topicName: string;
  probability: number;       // 0-100
  confidence: number;        // 0-1
  difficulty: 'easy' | 'medium' | 'hard';
  studyStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'NEEDS_REVIEW' | 'MASTERED';
  currentMastery: number;    // 0-100
  recommendedTime: number;   // minutes
  reasoning: string;
}

export interface StudyPlan {
  totalStudyTime: number;
  dailySchedule: Record<string, TopicPrediction[]>;
  priorityOrder: string[];
}
```

**Commit 15**: Create exam prediction context
- Create `apps/web/src/contexts/exam-prediction-context.tsx`
- State management for predictions
- Auto-refresh and caching

### Phase 6: Frontend - Prediction Dashboard (Commits 16-17)

**Commit 16**: Create exam prediction page and components
- Create `apps/web/src/app/(dashboard)/exam-prep/page.tsx`
- Create components:
  - `PredictionCard.tsx` - Overview of a prediction
  - `TopicProbabilityList.tsx` - List of topics with probabilities
  - `ReadinessGauge.tsx` - Visual readiness meter
  - `StudyPlanTimeline.tsx` - Daily study schedule

**Commit 17**: Create prediction creation wizard
- Create components:
  - `CreatePredictionWizard.tsx` - Multi-step wizard
  - `SelectUploadsStep.tsx` - Select content to analyze
  - `ExamDetailsStep.tsx` - Exam name, date
  - `PredictionResultsStep.tsx` - Show generated prediction

### Phase 7: Polish & Integration (Commit 18)

**Commit 18**: Integration and final touches
- Add subscription gating (STUDENT_PLUS+)
- Add navigation to exam prep from dashboard
- Add "Prepare for Exam" CTA in uploads
- Add prediction refresh functionality
- Add export study plan as PDF

## API Endpoints Detail

### Prediction Endpoints

```
POST /api/predictions
Body: {
  title: "Midterm 1",
  examDate: "2024-02-15T00:00:00Z",
  uploadIds: ["upload1", "upload2"],
  courseContext: "Introduction to Biology - Fall 2024"
}
Response: {
  prediction: ExamPrediction,
  studyPlan: StudyPlan
}

GET /api/predictions/:id
Response: {
  prediction: {
    id: "...",
    title: "Midterm 1",
    examDate: "2024-02-15T00:00:00Z",
    overallReadiness: 72,
    status: "ACTIVE",
    topicPredictions: [
      {
        topicName: "Cell Division",
        probability: 95,
        confidence: 0.85,
        difficulty: "medium",
        studyStatus: "IN_PROGRESS",
        currentMastery: 65,
        recommendedTime: 90,
        reasoning: "This topic was heavily emphasized in lectures 3-5..."
      },
      ...
    ]
  }
}

GET /api/predictions/:id/readiness
Response: {
  overall: 72,
  breakdown: {
    highProbability: { topics: 5, mastery: 78 },
    mediumProbability: { topics: 8, mastery: 65 },
    lowProbability: { topics: 4, mastery: 45 }
  },
  recommendations: [
    "Focus on 'Organic Chemistry Reactions' - high probability, low mastery",
    "Review 'Cell Division' before the exam",
    "You're well prepared for 'Basic Genetics'"
  ],
  estimatedGrade: "B+"
}

POST /api/predictions/:id/feedback
Body: {
  actualScore: 85,
  topicsAppeared: ["Cell Division", "Genetics", "Evolution"],
  surpriseTopics: ["Ecology"],
  topicsMissed: ["Taxonomy"],
  feedbackNotes: "The exam focused more on applications than theory"
}
Response: {
  message: "Feedback recorded",
  predictionAccuracy: 78,
  insights: "Your prediction was 78% accurate. Ecology was a surprise topic..."
}
```

## Database Schema Changes

### New Models Summary
```prisma
model ExamPrediction {
  id                String    @id @default(cuid())
  userId            String
  title             String
  examDate          DateTime?
  courseContext     String?
  status            PredictionStatus @default(ACTIVE)
  overallReadiness  Float     @default(0)
  generatedAt       DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  topicPredictions  TopicPrediction[]
  studyPlan         StudyPlan?
  actualExam        ActualExamResult?

  @@index([userId])
  @@index([status])
}

model TopicPrediction {
  id                  String    @id @default(cuid())
  examPredictionId    String
  conceptId           String?
  topicName           String
  probability         Float
  confidence          Float     @default(0.7)
  difficulty          String    @default("medium")
  importanceScore     Float     @default(0.5)
  emphasisScore       Float     @default(0.5)
  studyStatus         StudyStatus @default(NOT_STARTED)
  currentMastery      Float     @default(0)
  recommendedTime     Int       @default(60)
  reasoning           String?

  examPrediction      ExamPrediction @relation(fields: [examPredictionId], references: [id], onDelete: Cascade)
  concept             Concept?   @relation(fields: [conceptId], references: [id], onDelete: SetNull)

  @@index([examPredictionId])
}

model StudyPlan {
  id                  String    @id @default(cuid())
  examPredictionId    String    @unique
  totalStudyTime      Int
  dailySchedule       Json
  priorityOrder       String[]
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  examPrediction      ExamPrediction @relation(fields: [examPredictionId], references: [id], onDelete: Cascade)
}

model ActualExamResult {
  id                  String    @id @default(cuid())
  examPredictionId    String    @unique
  actualScore         Float?
  topicsAppeared      String[]
  topicsMissed        String[]
  surpriseTopics      String[]
  feedbackNotes       String?
  submittedAt         DateTime  @default(now())

  examPrediction      ExamPrediction @relation(fields: [examPredictionId], references: [id], onDelete: Cascade)
}

enum PredictionStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum StudyStatus {
  NOT_STARTED
  IN_PROGRESS
  NEEDS_REVIEW
  MASTERED
}
```

## Code Implementation Examples

### Exam Prediction Service
```typescript
// apps/api/src/services/examPrediction.service.ts
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { embeddingService } from './embedding.service';

const prisma = new PrismaClient();

export class ExamPredictionService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  /**
   * Generate exam prediction from uploads
   */
  async generatePrediction(
    userId: string,
    uploadIds: string[],
    title: string,
    examDate?: Date,
    courseContext?: string
  ) {
    // 1. Get all concepts from the uploads
    const concepts = await prisma.concept.findMany({
      where: {
        userId,
        uploadId: { in: uploadIds },
      },
      include: {
        outgoingRelations: true,
        incomingRelations: true,
      },
      orderBy: { importance: 'desc' },
    });

    if (concepts.length === 0) {
      throw new Error('No concepts found. Please extract concepts from your uploads first.');
    }

    // 2. Get uploads for emphasis detection
    const uploads = await prisma.upload.findMany({
      where: { id: { in: uploadIds } },
      select: { id: true, extractedText: true, originalName: true },
    });

    // 3. Detect professor emphasis patterns
    const emphasisScores = await this.detectEmphasis(uploads);

    // 4. Get user's study performance on these topics
    const studyPerformance = await this.getStudyPerformance(userId, concepts);

    // 5. Calculate topic probabilities
    const topicPredictions = await this.calculateProbabilities(
      concepts,
      emphasisScores,
      studyPerformance
    );

    // 6. Create prediction record
    const prediction = await prisma.examPrediction.create({
      data: {
        userId,
        title,
        examDate,
        courseContext,
        topicPredictions: {
          create: topicPredictions.map((tp, index) => ({
            topicName: tp.topicName,
            conceptId: tp.conceptId,
            probability: tp.probability,
            confidence: tp.confidence,
            difficulty: tp.difficulty,
            importanceScore: tp.importanceScore,
            emphasisScore: tp.emphasisScore,
            currentMastery: tp.currentMastery,
            recommendedTime: tp.recommendedTime,
            reasoning: tp.reasoning,
          })),
        },
      },
      include: {
        topicPredictions: true,
      },
    });

    // 7. Calculate overall readiness
    const readiness = this.calculateReadiness(topicPredictions);
    await prisma.examPrediction.update({
      where: { id: prediction.id },
      data: { overallReadiness: readiness },
    });

    // 8. Generate study plan
    const studyPlan = await this.generateStudyPlan(
      prediction.id,
      topicPredictions,
      examDate ? this.daysUntil(examDate) : 7
    );

    return { prediction, studyPlan };
  }

  /**
   * Detect professor emphasis from content
   */
  private async detectEmphasis(
    uploads: { id: string; extractedText: string | null; originalName: string }[]
  ): Promise<Map<string, number>> {
    const emphasisMap = new Map<string, number>();

    for (const upload of uploads) {
      if (!upload.extractedText) continue;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You analyze lecture content to detect which topics professors emphasize.
Look for: explicit importance statements, repeated mentions, detailed explanations, practice problems.
Return JSON: { "topics": [{ "name": "Topic", "emphasis": 0.0-1.0, "signals": ["signal1"] }] }`,
          },
          {
            role: 'user',
            content: upload.extractedText.slice(0, 15000),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      for (const topic of result.topics || []) {
        const current = emphasisMap.get(topic.name.toLowerCase()) || 0;
        emphasisMap.set(topic.name.toLowerCase(), Math.max(current, topic.emphasis));
      }
    }

    return emphasisMap;
  }

  /**
   * Get user's study performance on topics
   */
  private async getStudyPerformance(
    userId: string,
    concepts: { id: string; name: string }[]
  ): Promise<Map<string, number>> {
    const performanceMap = new Map<string, number>();

    // Get flashcard performance by topic (from tags)
    const flashcardSets = await prisma.flashcardSet.findMany({
      where: { userId },
      include: {
        flashcards: {
          select: { correctCount: true, timesReviewed: true },
        },
      },
    });

    for (const set of flashcardSets) {
      const totalReviews = set.flashcards.reduce((sum, f) => sum + f.timesReviewed, 0);
      const totalCorrect = set.flashcards.reduce((sum, f) => sum + f.correctCount, 0);
      const accuracy = totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0;

      for (const tag of set.tags) {
        performanceMap.set(tag.toLowerCase(), accuracy);
      }
    }

    // Get quiz performance by topic
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId, completed: true },
      include: {
        quiz: { select: { tags: true } },
      },
    });

    for (const attempt of quizAttempts) {
      for (const tag of attempt.quiz.tags) {
        const current = performanceMap.get(tag.toLowerCase()) || 0;
        performanceMap.set(
          tag.toLowerCase(),
          (current + attempt.score) / 2 // Average with existing
        );
      }
    }

    return performanceMap;
  }

  /**
   * Calculate topic probabilities
   */
  private async calculateProbabilities(
    concepts: Array<{
      id: string;
      name: string;
      importance: number;
      description: string | null;
      entityType: string;
    }>,
    emphasisScores: Map<string, number>,
    studyPerformance: Map<string, number>
  ) {
    const predictions = [];

    for (const concept of concepts) {
      const topicLower = concept.name.toLowerCase();
      const emphasis = emphasisScores.get(topicLower) || 0.5;
      const mastery = studyPerformance.get(topicLower) || 0;

      // Calculate probability based on importance and emphasis
      const probability = Math.min(
        100,
        Math.round(
          (concept.importance * 40) +     // 40% weight on concept importance
          (emphasis * 40) +               // 40% weight on professor emphasis
          (this.entityTypeWeight(concept.entityType) * 20) // 20% on entity type
        )
      );

      // Calculate confidence based on available data
      const confidence = Math.min(
        1,
        0.5 + (emphasisScores.has(topicLower) ? 0.2 : 0) + (concept.importance > 0.7 ? 0.2 : 0.1)
      );

      // Determine difficulty based on entity type and importance
      const difficulty = this.estimateDifficulty(concept);

      // Recommended study time based on probability and current mastery
      const recommendedTime = Math.round(
        (probability / 100) * 120 * (1 - mastery / 100) // Max 120 min per topic
      );

      predictions.push({
        topicName: concept.name,
        conceptId: concept.id,
        probability,
        confidence,
        difficulty,
        importanceScore: concept.importance,
        emphasisScore: emphasis,
        currentMastery: mastery,
        recommendedTime: Math.max(15, recommendedTime), // Min 15 minutes
        reasoning: this.generateReasoning(concept, probability, emphasis),
      });
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Generate study plan
   */
  private async generateStudyPlan(
    predictionId: string,
    predictions: Array<{
      topicName: string;
      probability: number;
      currentMastery: number;
      recommendedTime: number;
    }>,
    daysUntilExam: number
  ) {
    const totalStudyTime = predictions.reduce((sum, p) => sum + p.recommendedTime, 0);
    const dailyTime = Math.ceil(totalStudyTime / Math.max(1, daysUntilExam));

    // Prioritize: high probability + low mastery
    const prioritized = [...predictions].sort((a, b) => {
      const priorityA = a.probability * (100 - a.currentMastery);
      const priorityB = b.probability * (100 - b.currentMastery);
      return priorityB - priorityA;
    });

    // Distribute topics across days
    const dailySchedule: Record<string, typeof predictions> = {};
    let currentDay = 1;
    let currentDayTime = 0;

    for (const topic of prioritized) {
      if (currentDayTime + topic.recommendedTime > dailyTime && currentDay < daysUntilExam) {
        currentDay++;
        currentDayTime = 0;
      }

      const dayKey = `day${currentDay}`;
      if (!dailySchedule[dayKey]) {
        dailySchedule[dayKey] = [];
      }
      dailySchedule[dayKey].push(topic);
      currentDayTime += topic.recommendedTime;
    }

    return prisma.studyPlan.create({
      data: {
        examPredictionId: predictionId,
        totalStudyTime,
        dailySchedule,
        priorityOrder: prioritized.map(p => p.topicName),
      },
    });
  }

  /**
   * Calculate overall readiness
   */
  private calculateReadiness(predictions: Array<{ probability: number; currentMastery: number }>) {
    if (predictions.length === 0) return 0;

    // Weighted average: high probability topics count more
    let weightedSum = 0;
    let weightSum = 0;

    for (const p of predictions) {
      const weight = p.probability / 100;
      weightedSum += p.currentMastery * weight;
      weightSum += weight;
    }

    return Math.round(weightedSum / Math.max(0.01, weightSum));
  }

  private entityTypeWeight(entityType: string): number {
    const weights: Record<string, number> = {
      THEORY: 0.9,
      FORMULA: 0.85,
      PRINCIPLE: 0.8,
      PROCESS: 0.75,
      CONCEPT: 0.7,
      TERM: 0.6,
      PERSON: 0.5,
      EVENT: 0.5,
      EXAMPLE: 0.4,
      DATE: 0.3,
    };
    return weights[entityType] || 0.5;
  }

  private estimateDifficulty(concept: { importance: number; entityType: string }): string {
    const hardTypes = ['FORMULA', 'PROCESS', 'THEORY'];
    const easyTypes = ['DATE', 'TERM', 'PERSON'];

    if (hardTypes.includes(concept.entityType) || concept.importance > 0.8) {
      return 'hard';
    } else if (easyTypes.includes(concept.entityType) || concept.importance < 0.4) {
      return 'easy';
    }
    return 'medium';
  }

  private generateReasoning(
    concept: { name: string; importance: number; entityType: string },
    probability: number,
    emphasis: number
  ): string {
    const reasons = [];

    if (concept.importance > 0.7) {
      reasons.push(`"${concept.name}" is a core concept in the material`);
    }

    if (emphasis > 0.7) {
      reasons.push('Professor emphasized this topic heavily');
    } else if (emphasis > 0.5) {
      reasons.push('Moderate emphasis detected in lectures');
    }

    if (concept.entityType === 'FORMULA' || concept.entityType === 'PROCESS') {
      reasons.push('Calculation-heavy topics often appear on exams');
    }

    if (probability > 80) {
      return `High likelihood (${probability}%): ${reasons.join('. ')}`;
    } else if (probability > 50) {
      return `Medium likelihood (${probability}%): ${reasons.join('. ')}`;
    }
    return `Lower likelihood (${probability}%): May appear but not a focus area`;
  }

  private daysUntil(date: Date): number {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
}

export const examPredictionService = new ExamPredictionService();
```

### Exam Prediction Controller
```typescript
// apps/api/src/controllers/examPrediction.controller.ts
import { Request, Response, NextFunction } from 'express';
import { examPredictionService } from '../services/examPrediction.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ExamPredictionController {
  async createPrediction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { title, examDate, uploadIds, courseContext } = req.body;

      if (!title || !uploadIds || uploadIds.length === 0) {
        res.status(400).json({ error: 'Title and at least one upload are required' });
        return;
      }

      // Verify uploads belong to user
      const uploads = await prisma.upload.findMany({
        where: { id: { in: uploadIds }, userId },
      });

      if (uploads.length !== uploadIds.length) {
        res.status(400).json({ error: 'Some uploads not found' });
        return;
      }

      const { prediction, studyPlan } = await examPredictionService.generatePrediction(
        userId,
        uploadIds,
        title,
        examDate ? new Date(examDate) : undefined,
        courseContext
      );

      res.status(201).json({
        message: 'Prediction generated successfully',
        prediction: {
          ...prediction,
          studyPlan,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getPredictions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const status = req.query.status as string | undefined;

      const where: Record<string, unknown> = { userId };
      if (status) {
        where.status = status;
      }

      const predictions = await prisma.examPrediction.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        include: {
          topicPredictions: {
            orderBy: { probability: 'desc' },
            take: 5,
          },
          _count: { select: { topicPredictions: true } },
        },
      });

      res.json({ predictions });
    } catch (error) {
      next(error);
    }
  }

  async getPrediction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const prediction = await prisma.examPrediction.findFirst({
        where: { id, userId },
        include: {
          topicPredictions: {
            orderBy: { probability: 'desc' },
            include: { concept: true },
          },
          studyPlan: true,
          actualExam: true,
        },
      });

      if (!prediction) {
        res.status(404).json({ error: 'Prediction not found' });
        return;
      }

      res.json({ prediction });
    } catch (error) {
      next(error);
    }
  }

  async getReadiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const prediction = await prisma.examPrediction.findFirst({
        where: { id, userId },
        include: {
          topicPredictions: true,
        },
      });

      if (!prediction) {
        res.status(404).json({ error: 'Prediction not found' });
        return;
      }

      // Calculate readiness breakdown
      const high = prediction.topicPredictions.filter(t => t.probability >= 70);
      const medium = prediction.topicPredictions.filter(t => t.probability >= 40 && t.probability < 70);
      const low = prediction.topicPredictions.filter(t => t.probability < 40);

      const avgMastery = (topics: typeof high) =>
        topics.length > 0
          ? Math.round(topics.reduce((sum, t) => sum + t.currentMastery, 0) / topics.length)
          : 0;

      // Generate recommendations
      const recommendations = [];
      const weakHighPriority = high.filter(t => t.currentMastery < 60);
      for (const topic of weakHighPriority.slice(0, 3)) {
        recommendations.push(
          `Focus on "${topic.topicName}" - high probability (${topic.probability}%), low mastery (${Math.round(topic.currentMastery)}%)`
        );
      }

      const strongTopics = prediction.topicPredictions.filter(t => t.currentMastery >= 80);
      if (strongTopics.length > 0) {
        recommendations.push(`You're well prepared for: ${strongTopics.slice(0, 3).map(t => t.topicName).join(', ')}`);
      }

      // Estimate grade
      const gradeMap = [
        { min: 90, grade: 'A' },
        { min: 80, grade: 'B+' },
        { min: 70, grade: 'B' },
        { min: 60, grade: 'C+' },
        { min: 50, grade: 'C' },
        { min: 0, grade: 'D' },
      ];
      const estimatedGrade = gradeMap.find(g => prediction.overallReadiness >= g.min)?.grade || 'D';

      res.json({
        overall: prediction.overallReadiness,
        breakdown: {
          highProbability: { topics: high.length, mastery: avgMastery(high) },
          mediumProbability: { topics: medium.length, mastery: avgMastery(medium) },
          lowProbability: { topics: low.length, mastery: avgMastery(low) },
        },
        recommendations,
        estimatedGrade,
      });
    } catch (error) {
      next(error);
    }
  }

  async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { actualScore, topicsAppeared, surpriseTopics, topicsMissed, feedbackNotes } = req.body;

      const prediction = await prisma.examPrediction.findFirst({
        where: { id, userId },
        include: { topicPredictions: true },
      });

      if (!prediction) {
        res.status(404).json({ error: 'Prediction not found' });
        return;
      }

      // Record feedback
      const result = await prisma.actualExamResult.create({
        data: {
          examPredictionId: id,
          actualScore,
          topicsAppeared: topicsAppeared || [],
          surpriseTopics: surpriseTopics || [],
          topicsMissed: topicsMissed || [],
          feedbackNotes,
        },
      });

      // Update prediction status
      await prisma.examPrediction.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });

      // Calculate prediction accuracy
      const predictedTopics = prediction.topicPredictions
        .filter(t => t.probability >= 50)
        .map(t => t.topicName.toLowerCase());

      const actualTopicsLower = (topicsAppeared || []).map((t: string) => t.toLowerCase());
      const correctPredictions = predictedTopics.filter(t => actualTopicsLower.includes(t)).length;
      const accuracy = predictedTopics.length > 0
        ? Math.round((correctPredictions / predictedTopics.length) * 100)
        : 0;

      res.json({
        message: 'Feedback recorded successfully',
        predictionAccuracy: accuracy,
        insights: this.generateInsights(prediction, result, accuracy),
      });
    } catch (error) {
      next(error);
    }
  }

  private generateInsights(
    prediction: { topicPredictions: Array<{ topicName: string; probability: number }> },
    result: { surpriseTopics: string[]; topicsMissed: string[] },
    accuracy: number
  ): string {
    const insights = [`Your prediction was ${accuracy}% accurate.`];

    if (result.surpriseTopics.length > 0) {
      insights.push(`Surprise topics: ${result.surpriseTopics.join(', ')}`);
    }

    if (accuracy >= 70) {
      insights.push('Great job! Your preparation strategy is working well.');
    } else if (accuracy >= 50) {
      insights.push('Room for improvement. Consider reviewing emphasis detection in future predictions.');
    } else {
      insights.push('Consider uploading more lecture materials for better predictions.');
    }

    return insights.join(' ');
  }
}
```

## Component Structure

### Exam Prep Page Components
```
apps/web/src/app/(dashboard)/exam-prep/
├── page.tsx                    # Main exam prep page
├── new/page.tsx               # Create new prediction wizard
├── [id]/page.tsx              # Prediction details
└── [id]/study-plan/page.tsx   # Study plan view

apps/web/src/components/exam-prediction/
├── PredictionCard.tsx          # Prediction overview card
├── TopicProbabilityList.tsx    # List of predicted topics
├── TopicProbabilityBar.tsx     # Single topic probability bar
├── ReadinessGauge.tsx          # Circular readiness meter
├── StudyPlanTimeline.tsx       # Daily study schedule
├── CreatePredictionWizard/
│   ├── index.tsx              # Wizard container
│   ├── SelectUploadsStep.tsx  # Step 1: Select content
│   ├── ExamDetailsStep.tsx    # Step 2: Exam info
│   └── ResultsStep.tsx        # Step 3: View results
├── ExamFeedbackModal.tsx       # Post-exam feedback form
└── PredictionAccuracyStats.tsx # Historical accuracy
```

## Feature Requirements Checklist

### Core Prediction Features
- [ ] Generate predictions from uploaded content
- [ ] Calculate topic probability scores (0-100%)
- [ ] Detect professor emphasis patterns
- [ ] Link predictions to knowledge graph concepts
- [ ] Show confidence levels for predictions
- [ ] Predict question types per topic

### Study Plan Generation
- [ ] Create prioritized topic list
- [ ] Calculate recommended study time per topic
- [ ] Generate daily study schedule
- [ ] Track study progress per topic
- [ ] Update plan based on progress

### Readiness Assessment
- [ ] Calculate overall readiness score (0-100)
- [ ] Show readiness breakdown by probability tier
- [ ] Estimate exam grade
- [ ] Generate actionable recommendations
- [ ] Track mastery from quiz/flashcard performance

### Feedback Loop
- [ ] Record actual exam topics
- [ ] Track prediction accuracy
- [ ] Identify surprise topics and misses
- [ ] Use feedback to improve future predictions
- [ ] Show historical accuracy stats

### UI/UX
- [ ] Prediction creation wizard
- [ ] Topic probability visualization
- [ ] Readiness gauge component
- [ ] Study plan timeline view
- [ ] Mobile-responsive design
- [ ] Premium feature gating (STUDENT_PLUS+)

## Success Criteria

- [ ] All 18 commits completed and passing CI
- [ ] 70%+ prediction accuracy (verified via feedback loop)
- [ ] Study plans generate in <5 seconds
- [ ] Predictions consider concept importance, emphasis, and relationships
- [ ] Users can track study progress per topic
- [ ] Post-exam feedback improves future predictions
- [ ] Feature properly gated to STUDENT_PLUS+ tiers
- [ ] Page loads in <2 seconds
- [ ] Mobile-responsive design works

## Integration with Existing Features

### Knowledge Graph Integration
- Use `Concept` importance scores as base signal
- Use `ConceptRelationship` to find prerequisite chains
- Link `TopicPrediction` to `Concept` for semantic search

### Quiz/Flashcard Integration
- Calculate `currentMastery` from quiz/flashcard performance
- Update mastery after study sessions
- Generate focused flashcards for weak areas (future)

### Analytics Integration (SSC-17)
- Show exam prep progress in analytics dashboard
- Include prediction accuracy in overall stats
- Track study time spent on predicted topics

## Future Enhancements

1. **Historical Exam Patterns**: Allow users to contribute past exam data
2. **Collaborative Predictions**: Aggregate predictions from classmates
3. **Smart Reminders**: Push notifications for study sessions
4. **AI Tutor Integration**: Explain difficult predicted topics
5. **Professor Style Detection**: Learn from multiple courses with same professor
6. **Question Bank Generation**: Auto-generate practice questions for predicted topics

## Notes

- This feature is **only available for STUDENT_PLUS and UNIVERSITY tiers**
- Predictions should be regenerated when new content is uploaded
- Confidence scores should increase with more data
- Post-exam feedback is crucial for improving accuracy over time
- Consider adding caching for repeated prediction requests
