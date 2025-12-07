import OpenAI from 'openai';
import { Difficulty } from '@prisma/client';

// Types for flashcard generation
export interface GeneratedFlashcard {
  question: string;
  answer: string;
  hint?: string;
  difficulty: Difficulty;
  topic?: string;
  qualityScore: number;
}

export interface FlashcardGenerationResult {
  flashcards: GeneratedFlashcard[];
  metadata: {
    totalGenerated: number;
    averageQualityScore: number;
    topics: string[];
    processingTimeMs: number;
  };
}

export interface GenerationOptions {
  maxCards?: number;
  minCards?: number;
  difficulty?: 'mixed' | 'easy' | 'medium' | 'hard';
  includeHints?: boolean;
  focusTopics?: string[];
  questionTypes?: ('factual' | 'conceptual' | 'application' | 'fill-in-blank')[];
}

// Prompt templates for different question types
const SYSTEM_PROMPT = `You are an expert educational content creator specializing in creating high-quality flashcards for studying. Your flashcards should:

1. Focus on key concepts, definitions, facts, and relationships
2. Use clear, concise language
3. Create questions that test understanding, not just memorization
4. Provide accurate, complete answers
5. Include helpful hints when appropriate
6. Vary difficulty levels appropriately based on concept complexity

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.`;

const GENERATION_PROMPT = `Analyze the following lecture content and create high-quality flashcards.

LECTURE CONTENT:
---
{content}
---

REQUIREMENTS:
- Generate between {minCards} and {maxCards} flashcards
- Difficulty distribution: {difficultyGuidance}
- Question types to include: {questionTypes}
{focusTopicsGuidance}
- Include hints for harder concepts

For each flashcard, assess quality based on:
- Clarity: Is the question clear and unambiguous?
- Accuracy: Is the answer factually correct?
- Relevance: Does it cover important material?
- Testability: Can a student reasonably answer this?

Return a JSON object with this exact structure:
{
  "flashcards": [
    {
      "question": "Clear question text",
      "answer": "Accurate, complete answer",
      "hint": "Optional helpful hint (or null)",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "topic": "The specific topic this covers",
      "qualityScore": 0.0-1.0 (your assessment of card quality)
    }
  ],
  "extractedTopics": ["topic1", "topic2", ...]
}`;

export class FlashcardGenerationService {
  private openai: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set. AI flashcard generation will not work.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key-for-init',
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  }

  /**
   * Generate flashcards from text content using AI
   */
  async generateFromText(
    content: string,
    options: GenerationOptions = {}
  ): Promise<FlashcardGenerationResult> {
    const startTime = Date.now();

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    // Set default options
    const {
      maxCards = 20,
      minCards = 10,
      difficulty = 'mixed',
      includeHints = true,
      focusTopics = [],
      questionTypes = ['factual', 'conceptual', 'application'],
    } = options;

    // Truncate content if too long (GPT-4 context limit considerations)
    const truncatedContent = this.truncateContent(content, 25000);

    // Build the prompt
    const prompt = this.buildPrompt(truncatedContent, {
      maxCards,
      minCards,
      difficulty,
      includeHints,
      focusTopics,
      questionTypes,
    });

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse the response
      const parsed = JSON.parse(responseText);
      const flashcards = this.validateAndNormalizeFlashcards(parsed.flashcards || []);

      // Calculate metadata
      const processingTimeMs = Date.now() - startTime;
      const averageQualityScore = flashcards.length > 0
        ? flashcards.reduce((sum, f) => sum + f.qualityScore, 0) / flashcards.length
        : 0;

      // Extract unique topics
      const topics = [...new Set([
        ...flashcards.map(f => f.topic).filter(Boolean),
        ...(parsed.extractedTopics || []),
      ])] as string[];

      return {
        flashcards,
        metadata: {
          totalGenerated: flashcards.length,
          averageQualityScore: Math.round(averageQualityScore * 100) / 100,
          topics,
          processingTimeMs,
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
   * Generate additional flashcards for specific topics
   */
  async generateForTopics(
    content: string,
    topics: string[],
    cardsPerTopic: number = 5
  ): Promise<FlashcardGenerationResult> {
    return this.generateFromText(content, {
      focusTopics: topics,
      maxCards: topics.length * cardsPerTopic,
      minCards: topics.length * 2,
    });
  }

  /**
   * Regenerate flashcards with different difficulty
   */
  async regenerateWithDifficulty(
    content: string,
    difficulty: 'easy' | 'medium' | 'hard',
    cardCount: number = 15
  ): Promise<FlashcardGenerationResult> {
    return this.generateFromText(content, {
      difficulty,
      maxCards: cardCount,
      minCards: Math.max(5, cardCount - 5),
    });
  }

  /**
   * Validate and normalize flashcards from AI response
   */
  private validateAndNormalizeFlashcards(rawFlashcards: unknown[]): GeneratedFlashcard[] {
    if (!Array.isArray(rawFlashcards)) {
      return [];
    }

    return rawFlashcards
      .filter((card): card is Record<string, unknown> =>
        typeof card === 'object' && card !== null
      )
      .map(card => this.normalizeFlashcard(card))
      .filter((card): card is GeneratedFlashcard => card !== null);
  }

  /**
   * Normalize a single flashcard
   */
  private normalizeFlashcard(card: Record<string, unknown>): GeneratedFlashcard | null {
    // Validate required fields
    if (typeof card.question !== 'string' || !card.question.trim()) {
      return null;
    }
    if (typeof card.answer !== 'string' || !card.answer.trim()) {
      return null;
    }

    // Normalize difficulty
    const difficultyMap: Record<string, Difficulty> = {
      'easy': 'EASY',
      'EASY': 'EASY',
      'medium': 'MEDIUM',
      'MEDIUM': 'MEDIUM',
      'hard': 'HARD',
      'HARD': 'HARD',
    };
    const difficulty = difficultyMap[String(card.difficulty)] || 'MEDIUM';

    // Normalize quality score
    let qualityScore = 0.7;
    if (typeof card.qualityScore === 'number') {
      qualityScore = Math.max(0, Math.min(1, card.qualityScore));
    }

    return {
      question: card.question.trim(),
      answer: card.answer.trim(),
      hint: typeof card.hint === 'string' && card.hint.trim() ? card.hint.trim() : undefined,
      difficulty,
      topic: typeof card.topic === 'string' ? card.topic.trim() : undefined,
      qualityScore,
    };
  }

  /**
   * Build the generation prompt
   */
  private buildPrompt(
    content: string,
    options: Required<Omit<GenerationOptions, 'includeHints'>> & { includeHints: boolean }
  ): string {
    const { maxCards, minCards, difficulty, focusTopics, questionTypes } = options;

    // Difficulty guidance
    const difficultyGuidance = difficulty === 'mixed'
      ? 'Mix of difficulties - approximately 30% EASY, 50% MEDIUM, 20% HARD'
      : `Focus primarily on ${difficulty.toUpperCase()} difficulty`;

    // Focus topics guidance
    const focusTopicsGuidance = focusTopics.length > 0
      ? `- Focus especially on these topics: ${focusTopics.join(', ')}`
      : '- Cover all major topics in the content';

    // Question types
    const questionTypesStr = questionTypes.join(', ');

    return GENERATION_PROMPT
      .replace('{content}', content)
      .replace('{minCards}', String(minCards))
      .replace('{maxCards}', String(maxCards))
      .replace('{difficultyGuidance}', difficultyGuidance)
      .replace('{questionTypes}', questionTypesStr)
      .replace('{focusTopicsGuidance}', focusTopicsGuidance);
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
   * Estimate the number of flashcards that can be generated from content
   */
  estimateCardCount(content: string): { min: number; max: number; recommended: number } {
    const wordCount = content.split(/\s+/).length;
    const paragraphCount = (content.match(/\n\n/g) || []).length + 1;

    // Heuristic: roughly 1 card per 50-100 words, or 1-2 cards per paragraph
    const byWords = Math.floor(wordCount / 75);
    const byParagraphs = Math.floor(paragraphCount * 1.5);

    const estimated = Math.max(byWords, byParagraphs);

    return {
      min: Math.max(5, Math.floor(estimated * 0.5)),
      max: Math.min(50, Math.ceil(estimated * 1.5)),
      recommended: Math.max(10, Math.min(30, estimated)),
    };
  }
}

export const flashcardGenerationService = new FlashcardGenerationService();
