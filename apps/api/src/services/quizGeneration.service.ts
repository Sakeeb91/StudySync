import OpenAI from 'openai';
import { QuestionType } from '@prisma/client';

// Types for quiz generation
export interface GeneratedQuestion {
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  qualityScore: number;
}

export interface QuizGenerationResult {
  questions: GeneratedQuestion[];
  metadata: {
    totalGenerated: number;
    averageQualityScore: number;
    topics: string[];
    processingTimeMs: number;
    difficultyDistribution: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
}

export interface QuizGenerationOptions {
  maxQuestions?: number;
  minQuestions?: number;
  difficulty?: 'mixed' | 'easy' | 'medium' | 'hard';
  questionTypes?: QuestionType[];
  focusTopics?: string[];
  includeExplanations?: boolean;
}

// Prompt templates
const SYSTEM_PROMPT = `You are an expert educational assessment creator specializing in creating high-quality quiz questions for students. Your questions should:

1. Test understanding, not just memorization
2. Cover key concepts, facts, and relationships
3. Use clear, unambiguous language
4. Have plausible but clearly incorrect wrong answers (for MCQ)
5. Include helpful explanations for learning
6. Vary in difficulty appropriately based on concept complexity

Question Types Guidelines:
- MULTIPLE_CHOICE: Provide exactly 4 options (A, B, C, D). Make sure wrong answers are plausible but clearly incorrect.
- TRUE_FALSE: State a clear fact that is definitively true or false. Avoid ambiguous statements.
- SHORT_ANSWER: Ask for specific, concise answers (1-3 words or a short phrase). Avoid open-ended questions.
- ESSAY: Ask for explanations, comparisons, or analysis. These should test deeper understanding.

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.`;

const GENERATION_PROMPT = `Analyze the following lecture content and create high-quality quiz questions.

LECTURE CONTENT:
---
{content}
---

REQUIREMENTS:
- Generate between {minQuestions} and {maxQuestions} questions
- Difficulty distribution: {difficultyGuidance}
- Question types to include: {questionTypes}
{focusTopicsGuidance}
- {explanationGuidance}

For each question, assess quality based on:
- Clarity: Is the question clear and unambiguous?
- Accuracy: Is the correct answer factually correct?
- Relevance: Does it cover important material?
- Testability: Can a student reasonably answer this?

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY",
      "question": "Clear question text",
      "options": ["Option A", "Option B", "Option C", "Option D"] (only for MULTIPLE_CHOICE, exactly 4 options),
      "correctAnswer": "The index for MCQ (0-3 as string), 'true'/'false' for TRUE_FALSE, or the answer text for SHORT_ANSWER/ESSAY",
      "explanation": "Why this answer is correct and why others are wrong",
      "points": 1-5 (based on difficulty),
      "difficulty": "easy" | "medium" | "hard",
      "topic": "The specific topic this covers",
      "qualityScore": 0.0-1.0 (your assessment of question quality)
    }
  ],
  "extractedTopics": ["topic1", "topic2", ...]
}

IMPORTANT NOTES:
- For MULTIPLE_CHOICE: correctAnswer should be the INDEX (0, 1, 2, or 3) as a STRING
- For TRUE_FALSE: correctAnswer should be "true" or "false" (lowercase string)
- For SHORT_ANSWER: correctAnswer should be the expected answer text
- For ESSAY: correctAnswer should be key points that should be covered
- Always include explanations unless told otherwise`;

export class QuizGenerationService {
  private openai: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set. AI quiz generation will not work.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key-for-init',
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  }

  /**
   * Generate quiz questions from text content using AI
   */
  async generateFromText(
    content: string,
    options: QuizGenerationOptions = {}
  ): Promise<QuizGenerationResult> {
    const startTime = Date.now();

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    // Set default options
    const {
      maxQuestions = 15,
      minQuestions = 10,
      difficulty = 'mixed',
      questionTypes = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'],
      focusTopics = [],
      includeExplanations = true,
    } = options;

    // Truncate content if too long (GPT-4 context limit considerations)
    const truncatedContent = this.truncateContent(content, 25000);

    // Build the prompt
    const prompt = this.buildPrompt(truncatedContent, {
      maxQuestions,
      minQuestions,
      difficulty,
      questionTypes: questionTypes as QuestionType[],
      focusTopics,
      includeExplanations,
    });

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 6000,
        response_format: { type: 'json_object' },
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse the response
      const parsed = JSON.parse(responseText);
      const questions = this.validateAndNormalizeQuestions(parsed.questions || []);

      // Calculate metadata
      const processingTimeMs = Date.now() - startTime;
      const averageQualityScore = questions.length > 0
        ? questions.reduce((sum, q) => sum + q.qualityScore, 0) / questions.length
        : 0;

      // Extract unique topics
      const topics = [...new Set([
        ...questions.map(q => q.topic).filter(Boolean),
        ...(parsed.extractedTopics || []),
      ])] as string[];

      // Calculate difficulty distribution
      const difficultyDistribution = {
        easy: questions.filter(q => q.difficulty === 'easy').length,
        medium: questions.filter(q => q.difficulty === 'medium').length,
        hard: questions.filter(q => q.difficulty === 'hard').length,
      };

      return {
        questions,
        metadata: {
          totalGenerated: questions.length,
          averageQualityScore: Math.round(averageQualityScore * 100) / 100,
          topics,
          processingTimeMs,
          difficultyDistribution,
        },
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse AI response. Please try again.');
      }
      throw error;
    }
  }

  /**
   * Generate additional questions for specific topics
   */
  async generateForTopics(
    content: string,
    topics: string[],
    questionsPerTopic: number = 3
  ): Promise<QuizGenerationResult> {
    return this.generateFromText(content, {
      focusTopics: topics,
      maxQuestions: topics.length * questionsPerTopic,
      minQuestions: topics.length * 2,
    });
  }

  /**
   * Regenerate questions with specific difficulty
   */
  async regenerateWithDifficulty(
    content: string,
    difficulty: 'easy' | 'medium' | 'hard',
    questionCount: number = 10
  ): Promise<QuizGenerationResult> {
    return this.generateFromText(content, {
      difficulty,
      maxQuestions: questionCount,
      minQuestions: Math.max(5, questionCount - 3),
    });
  }

  /**
   * Validate and normalize questions from AI response
   */
  private validateAndNormalizeQuestions(rawQuestions: unknown[]): GeneratedQuestion[] {
    if (!Array.isArray(rawQuestions)) {
      return [];
    }

    return rawQuestions
      .filter((q): q is Record<string, unknown> =>
        typeof q === 'object' && q !== null
      )
      .map(q => this.normalizeQuestion(q))
      .filter((q): q is GeneratedQuestion => q !== null);
  }

  /**
   * Normalize a single question
   */
  private normalizeQuestion(q: Record<string, unknown>): GeneratedQuestion | null {
    // Validate required fields
    if (typeof q.question !== 'string' || !q.question.trim()) {
      return null;
    }

    // Normalize question type
    const typeMap: Record<string, QuestionType> = {
      'multiple_choice': 'MULTIPLE_CHOICE',
      'MULTIPLE_CHOICE': 'MULTIPLE_CHOICE',
      'true_false': 'TRUE_FALSE',
      'TRUE_FALSE': 'TRUE_FALSE',
      'short_answer': 'SHORT_ANSWER',
      'SHORT_ANSWER': 'SHORT_ANSWER',
      'essay': 'ESSAY',
      'ESSAY': 'ESSAY',
    };
    const type = typeMap[String(q.type)] || 'MULTIPLE_CHOICE';

    // Validate options for MCQ
    let options: string[] | undefined;
    if (type === 'MULTIPLE_CHOICE') {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return null;
      }
      options = q.options.map(o => String(o)).slice(0, 4);
      // Ensure we have exactly 4 options
      while (options.length < 4) {
        options.push(`Option ${options.length + 1}`);
      }
    } else if (type === 'TRUE_FALSE') {
      options = ['True', 'False'];
    }

    // Normalize correct answer
    let correctAnswer = String(q.correctAnswer || '');
    if (type === 'MULTIPLE_CHOICE') {
      // Ensure it's a valid index
      const idx = parseInt(correctAnswer);
      if (isNaN(idx) || idx < 0 || idx > 3) {
        correctAnswer = '0';
      } else {
        correctAnswer = String(idx);
      }
    } else if (type === 'TRUE_FALSE') {
      correctAnswer = correctAnswer.toLowerCase() === 'true' ? 'true' : 'false';
    }

    if (!correctAnswer) {
      return null;
    }

    // Normalize difficulty
    const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
      'easy': 'easy',
      'EASY': 'easy',
      'medium': 'medium',
      'MEDIUM': 'medium',
      'hard': 'hard',
      'HARD': 'hard',
    };
    const difficulty = difficultyMap[String(q.difficulty)] || 'medium';

    // Normalize points based on difficulty
    let points = typeof q.points === 'number' ? q.points : 1;
    if (points < 1) points = 1;
    if (points > 5) points = 5;

    // Normalize quality score
    let qualityScore = 0.7;
    if (typeof q.qualityScore === 'number') {
      qualityScore = Math.max(0, Math.min(1, q.qualityScore));
    }

    return {
      type,
      question: q.question.trim(),
      options,
      correctAnswer,
      explanation: typeof q.explanation === 'string' && q.explanation.trim() ? q.explanation.trim() : undefined,
      points,
      difficulty,
      topic: typeof q.topic === 'string' ? q.topic.trim() : undefined,
      qualityScore,
    };
  }

  /**
   * Build the generation prompt
   */
  private buildPrompt(
    content: string,
    options: Required<QuizGenerationOptions>
  ): string {
    const { maxQuestions, minQuestions, difficulty, focusTopics, questionTypes, includeExplanations } = options;

    // Difficulty guidance
    const difficultyGuidance = difficulty === 'mixed'
      ? 'Mix of difficulties - approximately 30% easy, 50% medium, 20% hard'
      : `Focus primarily on ${difficulty} difficulty`;

    // Focus topics guidance
    const focusTopicsGuidance = focusTopics.length > 0
      ? `- Focus especially on these topics: ${focusTopics.join(', ')}`
      : '- Cover all major topics in the content';

    // Question types
    const questionTypesStr = questionTypes.join(', ');

    // Explanation guidance
    const explanationGuidance = includeExplanations
      ? 'Include detailed explanations for each question'
      : 'Skip explanations to save time';

    return GENERATION_PROMPT
      .replace('{content}', content)
      .replace('{minQuestions}', String(minQuestions))
      .replace('{maxQuestions}', String(maxQuestions))
      .replace('{difficultyGuidance}', difficultyGuidance)
      .replace('{questionTypes}', questionTypesStr)
      .replace('{focusTopicsGuidance}', focusTopicsGuidance)
      .replace('{explanationGuidance}', explanationGuidance);
  }

  /**
   * Truncate content while preserving meaningful text
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    // Try to truncate at a paragraph or sentence boundary
    const truncated = content.slice(0, maxLength);
    const lastParagraph = truncated.lastIndexOf('\n\n');
    const lastSentence = truncated.lastIndexOf('. ');

    const cutPoint = Math.max(
      lastParagraph > maxLength * 0.8 ? lastParagraph : -1,
      lastSentence > maxLength * 0.8 ? lastSentence + 1 : -1,
      maxLength * 0.9
    );

    return truncated.slice(0, cutPoint) + '\n\n[Content truncated for processing...]';
  }

  /**
   * Estimate the number of questions that can be generated from content
   */
  estimateQuestionCount(content: string): { min: number; max: number; recommended: number } {
    const wordCount = content.split(/\s+/).length;
    const paragraphCount = (content.match(/\n\n/g) || []).length + 1;

    // Heuristic: roughly 1 question per 100-200 words, or 1-2 questions per paragraph
    const byWords = Math.floor(wordCount / 150);
    const byParagraphs = Math.floor(paragraphCount * 1.5);

    const estimated = Math.max(byWords, byParagraphs);

    return {
      min: Math.max(5, Math.floor(estimated * 0.5)),
      max: Math.min(50, Math.ceil(estimated * 1.5)),
      recommended: Math.max(10, Math.min(25, estimated)),
    };
  }
}

export const quizGenerationService = new QuizGenerationService();
