import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Validation schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  university: z.string().optional(),
  major: z.string().optional(),
  yearOfStudy: z.number().min(1).max(10).optional(),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// JWT utilities
export interface JWTPayload {
  userId: string;
  email: string;
  subscriptionTier: string;
}

export const generateToken = (payload: JWTPayload): string => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(payload, secret, {
    expiresIn: '7d',
  });
};

export const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.verify(token, secret) as JWTPayload;
};

export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  return jwt.sign({ userId }, secret, {
    expiresIn: '30d',
  });
};

// Session management
export interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
    subscriptionTier: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export const createSession = (user: {
  id: string;
  email: string;
  name?: string;
  subscriptionTier: string;
}): Session => {
  const accessToken = generateToken({
    userId: user.id,
    email: user.email,
    subscriptionTier: user.subscriptionTier,
  });

  const refreshToken = generateRefreshToken(user.id);

  return {
    user,
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };
};

// ============================================
// QUIZ VALIDATION SCHEMAS
// ============================================

// Question type enum matching Prisma schema
export const QuestionTypeEnum = z.enum([
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'ESSAY',
]);

export type QuestionType = z.infer<typeof QuestionTypeEnum>;

// Create quiz schema
export const createQuizSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  uploadId: z.string().optional(),
  timeLimit: z.number().int().min(1).max(180).optional(), // 1-180 minutes
  passingScore: z.number().min(0).max(100).optional().default(70),
  isPublic: z.boolean().optional().default(false),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

// Update quiz schema
export const updateQuizSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  timeLimit: z.number().int().min(1).max(180).optional().nullable(),
  passingScore: z.number().min(0).max(100).optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;

// Create question schema
export const createQuestionSchema = z.object({
  type: QuestionTypeEnum,
  question: z.string().min(1, 'Question is required').max(2000),
  options: z.array(z.string().max(500)).min(2).max(6).optional(), // For MCQ/True-False
  correctAnswer: z.string().min(1, 'Correct answer is required').max(5000),
  explanation: z.string().max(2000).optional(),
  points: z.number().int().min(1).max(100).optional().default(1),
  order: z.number().int().min(0),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

// Update question schema
export const updateQuestionSchema = z.object({
  type: QuestionTypeEnum.optional(),
  question: z.string().min(1).max(2000).optional(),
  options: z.array(z.string().max(500)).min(2).max(6).optional().nullable(),
  correctAnswer: z.string().min(1).max(5000).optional(),
  explanation: z.string().max(2000).optional().nullable(),
  points: z.number().int().min(1).max(100).optional(),
  order: z.number().int().min(0).optional(),
});

export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

// Generate quiz from upload schema
export const generateQuizSchema = z.object({
  uploadId: z.string(),
  options: z.object({
    maxQuestions: z.number().min(5).max(50).optional().default(15),
    minQuestions: z.number().min(3).max(30).optional().default(10),
    difficulty: z.enum(['mixed', 'easy', 'medium', 'hard']).optional().default('mixed'),
    questionTypes: z.array(QuestionTypeEnum).optional(),
    focusTopics: z.array(z.string()).optional(),
    includeExplanations: z.boolean().optional().default(true),
  }).optional().default({}),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  timeLimit: z.number().int().min(1).max(180).optional(),
});

export type GenerateQuizInput = z.infer<typeof generateQuizSchema>;

// Submit answer schema
export const submitAnswerSchema = z.object({
  questionId: z.string(),
  userAnswer: z.string().max(5000),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

// Submit quiz schema (batch answers)
export const submitQuizSchema = z.object({
  answers: z.array(submitAnswerSchema).min(1),
  timeSpent: z.number().int().min(0), // in seconds
});

export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;

// Start quiz attempt schema
export const startAttemptSchema = z.object({
  quizId: z.string(),
});

export type StartAttemptInput = z.infer<typeof startAttemptSchema>;

// ============================================
// KNOWLEDGE GRAPH VALIDATION SCHEMAS
// ============================================

// Concept entity type enum matching Prisma schema
export const ConceptEntityTypeEnum = z.enum([
  'PERSON',
  'THEORY',
  'FORMULA',
  'EVENT',
  'TERM',
  'PROCESS',
  'PRINCIPLE',
  'CONCEPT',
  'EXAMPLE',
  'DATE',
]);

export type ConceptEntityType = z.infer<typeof ConceptEntityTypeEnum>;

// Relationship type enum matching Prisma schema
export const RelationshipTypeEnum = z.enum([
  'PREREQUISITE',
  'RELATED',
  'OPPOSITE',
  'EXAMPLE_OF',
  'PART_OF',
  'CAUSES',
  'DERIVED_FROM',
  'SIMILAR_TO',
  'APPLIED_IN',
  'SUPPORTS',
]);

export type RelationshipType = z.infer<typeof RelationshipTypeEnum>;

// Create concept schema
export const createConceptSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  entityType: ConceptEntityTypeEnum,
  uploadId: z.string().optional(),
  importance: z.number().min(0).max(1).optional().default(0.5),
  lectureOrder: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateConceptInput = z.infer<typeof createConceptSchema>;

// Update concept schema
export const updateConceptSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  entityType: ConceptEntityTypeEnum.optional(),
  importance: z.number().min(0).max(1).optional(),
  lectureOrder: z.number().int().min(0).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export type UpdateConceptInput = z.infer<typeof updateConceptSchema>;

// Create relationship schema
export const createRelationshipSchema = z.object({
  fromConceptId: z.string(),
  toConceptId: z.string(),
  relationshipType: RelationshipTypeEnum,
  strength: z.number().min(0).max(1).optional().default(1.0),
  description: z.string().max(500).optional(),
  bidirectional: z.boolean().optional().default(false),
});

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;

// Update relationship schema
export const updateRelationshipSchema = z.object({
  relationshipType: RelationshipTypeEnum.optional(),
  strength: z.number().min(0).max(1).optional(),
  description: z.string().max(500).optional().nullable(),
  bidirectional: z.boolean().optional(),
});

export type UpdateRelationshipInput = z.infer<typeof updateRelationshipSchema>;

// Extract concepts from upload schema
export const extractConceptsSchema = z.object({
  uploadId: z.string(),
  options: z.object({
    maxConcepts: z.number().min(5).max(50).optional().default(30),
    minImportance: z.number().min(0).max(1).optional().default(0.3),
    focusEntityTypes: z.array(ConceptEntityTypeEnum).optional(),
    extractRelationships: z.boolean().optional().default(true),
    includeContext: z.boolean().optional().default(false),
  }).optional().default({}),
});

export type ExtractConceptsInput = z.infer<typeof extractConceptsSchema>;

// Semantic search schema
export const semanticSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(500),
  options: z.object({
    limit: z.number().min(1).max(50).optional().default(10),
    minSimilarity: z.number().min(0).max(1).optional().default(0.5),
    entityTypes: z.array(ConceptEntityTypeEnum).optional(),
    uploadId: z.string().optional(),
  }).optional().default({}),
});

export type SemanticSearchInput = z.infer<typeof semanticSearchSchema>;