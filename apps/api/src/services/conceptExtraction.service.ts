import OpenAI from 'openai';
import { ConceptEntityType, RelationshipType } from '@prisma/client';
import {
  ExtractedConcept,
  ExtractedRelationship,
  ConceptExtractionResult,
  ConceptExtractionOptions,
} from './knowledgeGraph.types';

// System prompt for concept extraction
const SYSTEM_PROMPT = `You are an expert educational content analyzer specializing in extracting key concepts and their relationships from academic content. Your goal is to build a knowledge graph that helps students understand how concepts connect.

For each concept, identify:
1. The concept name (clear, concise identifier)
2. A brief description (1-2 sentences explaining the concept)
3. The entity type (PERSON, THEORY, FORMULA, EVENT, TERM, PROCESS, PRINCIPLE, CONCEPT, EXAMPLE, DATE)
4. Importance score (0.0-1.0) based on:
   - How central it is to understanding the material
   - How frequently it appears or is referenced
   - Whether the professor/author emphasizes it

For relationships between concepts, identify:
1. The type of relationship (PREREQUISITE, RELATED, OPPOSITE, EXAMPLE_OF, PART_OF, CAUSES, DERIVED_FROM, SIMILAR_TO, APPLIED_IN, SUPPORTS)
2. The strength of the relationship (0.0-1.0)
3. Whether it's bidirectional

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.`;

const EXTRACTION_PROMPT = `Analyze the following educational content and extract key concepts with their relationships.

CONTENT:
---
{content}
---

REQUIREMENTS:
- Extract between {minConcepts} and {maxConcepts} key concepts
- Focus on concepts with importance >= {minImportance}
{entityTypesGuidance}
{relationshipsGuidance}

Return a JSON object with this exact structure:
{
  "concepts": [
    {
      "name": "Clear concept name",
      "description": "Brief 1-2 sentence description",
      "entityType": "PERSON" | "THEORY" | "FORMULA" | "EVENT" | "TERM" | "PROCESS" | "PRINCIPLE" | "CONCEPT" | "EXAMPLE" | "DATE",
      "importance": 0.0-1.0,
      "context": "Optional: The sentence or context where this concept appears"
    }
  ],
  "relationships": [
    {
      "fromConceptName": "Name of source concept",
      "toConceptName": "Name of target concept",
      "relationshipType": "PREREQUISITE" | "RELATED" | "OPPOSITE" | "EXAMPLE_OF" | "PART_OF" | "CAUSES" | "DERIVED_FROM" | "SIMILAR_TO" | "APPLIED_IN" | "SUPPORTS",
      "strength": 0.0-1.0,
      "description": "Optional: Brief description of the relationship",
      "bidirectional": true | false
    }
  ],
  "topicSummary": "One sentence summary of the main topic"
}

Guidelines:
- Prioritize concepts that are central to understanding the material
- Include both main concepts and supporting concepts
- Ensure relationships accurately reflect how concepts connect
- PREREQUISITE means concept A must be understood before concept B
- RELATED means concepts are topically connected but neither requires the other
- Use PART_OF when one concept is a component of another
- Use CAUSES when there's a causal relationship`;

export class ConceptExtractionService {
  private openai: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set. Concept extraction will not work.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key-for-init',
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  }

  /**
   * Extract concepts and relationships from text content
   */
  async extractFromText(
    content: string,
    options: ConceptExtractionOptions = {}
  ): Promise<ConceptExtractionResult> {
    const startTime = Date.now();

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    // Set default options
    const {
      maxConcepts = 30,
      minImportance = 0.3,
      focusEntityTypes,
      extractRelationships = true,
      includeContext = false,
    } = options;

    // Truncate content if too long
    const truncatedContent = this.truncateContent(content, 25000);

    // Build the prompt
    const prompt = this.buildPrompt(truncatedContent, {
      maxConcepts,
      minConcepts: Math.max(5, Math.floor(maxConcepts / 3)),
      minImportance,
      focusEntityTypes,
      extractRelationships,
      includeContext,
    });

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5, // Lower temperature for more consistent extraction
        max_tokens: 6000,
        response_format: { type: 'json_object' },
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse the response
      const parsed = JSON.parse(responseText);
      const concepts = this.validateAndNormalizeConcepts(parsed.concepts || []);
      const relationships = extractRelationships
        ? this.validateAndNormalizeRelationships(parsed.relationships || [], concepts)
        : [];

      // Calculate metadata
      const processingTimeMs = Date.now() - startTime;
      const entityTypeDistribution = this.calculateEntityTypeDistribution(concepts);

      return {
        concepts,
        relationships,
        metadata: {
          totalConcepts: concepts.length,
          totalRelationships: relationships.length,
          processingTimeMs,
          topicSummary: parsed.topicSummary || 'Educational content analysis',
          entityTypeDistribution,
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
   * Extract concepts focused on specific topics
   */
  async extractForTopics(
    content: string,
    topics: string[],
    maxConceptsPerTopic: number = 10
  ): Promise<ConceptExtractionResult> {
    return this.extractFromText(content, {
      maxConcepts: topics.length * maxConceptsPerTopic,
      extractRelationships: true,
    });
  }

  /**
   * Validate and normalize concepts from AI response
   */
  private validateAndNormalizeConcepts(rawConcepts: unknown[]): ExtractedConcept[] {
    if (!Array.isArray(rawConcepts)) {
      return [];
    }

    const validEntityTypes = Object.values(ConceptEntityType);

    return rawConcepts
      .filter((c): c is Record<string, unknown> =>
        typeof c === 'object' && c !== null
      )
      .map(c => this.normalizeConcept(c, validEntityTypes))
      .filter((c): c is ExtractedConcept => c !== null);
  }

  /**
   * Normalize a single concept
   */
  private normalizeConcept(
    c: Record<string, unknown>,
    validEntityTypes: string[]
  ): ExtractedConcept | null {
    // Validate required fields
    if (typeof c.name !== 'string' || !c.name.trim()) {
      return null;
    }

    if (typeof c.description !== 'string' || !c.description.trim()) {
      return null;
    }

    // Normalize entity type
    let entityType: ConceptEntityType = 'CONCEPT';
    if (typeof c.entityType === 'string') {
      const normalizedType = c.entityType.toUpperCase();
      if (validEntityTypes.includes(normalizedType)) {
        entityType = normalizedType as ConceptEntityType;
      }
    }

    // Normalize importance
    let importance = 0.5;
    if (typeof c.importance === 'number') {
      importance = Math.max(0, Math.min(1, c.importance));
    }

    return {
      name: c.name.trim(),
      description: c.description.trim(),
      entityType,
      importance: Math.round(importance * 100) / 100,
      context: typeof c.context === 'string' ? c.context.trim() : undefined,
    };
  }

  /**
   * Validate and normalize relationships from AI response
   */
  private validateAndNormalizeRelationships(
    rawRelationships: unknown[],
    validConcepts: ExtractedConcept[]
  ): ExtractedRelationship[] {
    if (!Array.isArray(rawRelationships)) {
      return [];
    }

    const conceptNames = new Set(validConcepts.map(c => c.name.toLowerCase()));
    const validRelationshipTypes = Object.values(RelationshipType);

    return rawRelationships
      .filter((r): r is Record<string, unknown> =>
        typeof r === 'object' && r !== null
      )
      .map(r => this.normalizeRelationship(r, conceptNames, validRelationshipTypes))
      .filter((r): r is ExtractedRelationship => r !== null);
  }

  /**
   * Normalize a single relationship
   */
  private normalizeRelationship(
    r: Record<string, unknown>,
    validConceptNames: Set<string>,
    validRelationshipTypes: string[]
  ): ExtractedRelationship | null {
    // Validate required fields
    if (typeof r.fromConceptName !== 'string' || !r.fromConceptName.trim()) {
      return null;
    }
    if (typeof r.toConceptName !== 'string' || !r.toConceptName.trim()) {
      return null;
    }

    const fromName = r.fromConceptName.trim();
    const toName = r.toConceptName.trim();

    // Ensure both concepts exist
    if (!validConceptNames.has(fromName.toLowerCase()) || !validConceptNames.has(toName.toLowerCase())) {
      return null;
    }

    // Prevent self-referencing relationships
    if (fromName.toLowerCase() === toName.toLowerCase()) {
      return null;
    }

    // Normalize relationship type
    let relationshipType: RelationshipType = 'RELATED';
    if (typeof r.relationshipType === 'string') {
      const normalizedType = r.relationshipType.toUpperCase();
      if (validRelationshipTypes.includes(normalizedType)) {
        relationshipType = normalizedType as RelationshipType;
      }
    }

    // Normalize strength
    let strength = 0.5;
    if (typeof r.strength === 'number') {
      strength = Math.max(0, Math.min(1, r.strength));
    }

    return {
      fromConceptName: fromName,
      toConceptName: toName,
      relationshipType,
      strength: Math.round(strength * 100) / 100,
      description: typeof r.description === 'string' ? r.description.trim() : undefined,
      bidirectional: typeof r.bidirectional === 'boolean' ? r.bidirectional : false,
    };
  }

  /**
   * Build the extraction prompt
   */
  private buildPrompt(
    content: string,
    options: {
      maxConcepts: number;
      minConcepts: number;
      minImportance: number;
      focusEntityTypes?: ConceptEntityType[];
      extractRelationships: boolean;
      includeContext: boolean;
    }
  ): string {
    const { maxConcepts, minConcepts, minImportance, focusEntityTypes, extractRelationships } = options;
    // Note: includeContext is available in options for future use with context extraction

    // Entity types guidance
    const entityTypesGuidance = focusEntityTypes && focusEntityTypes.length > 0
      ? `- Focus especially on these entity types: ${focusEntityTypes.join(', ')}`
      : '- Include all relevant entity types';

    // Relationships guidance
    const relationshipsGuidance = extractRelationships
      ? '- Extract relationships between concepts to build a connected knowledge graph'
      : '- Skip relationship extraction';

    return EXTRACTION_PROMPT
      .replace('{content}', content)
      .replace('{minConcepts}', String(minConcepts))
      .replace('{maxConcepts}', String(maxConcepts))
      .replace('{minImportance}', String(minImportance))
      .replace('{entityTypesGuidance}', entityTypesGuidance)
      .replace('{relationshipsGuidance}', relationshipsGuidance);
  }

  /**
   * Calculate entity type distribution
   */
  private calculateEntityTypeDistribution(
    concepts: ExtractedConcept[]
  ): Record<ConceptEntityType, number> {
    const distribution: Record<ConceptEntityType, number> = {
      PERSON: 0,
      THEORY: 0,
      FORMULA: 0,
      EVENT: 0,
      TERM: 0,
      PROCESS: 0,
      PRINCIPLE: 0,
      CONCEPT: 0,
      EXAMPLE: 0,
      DATE: 0,
    };

    for (const concept of concepts) {
      distribution[concept.entityType]++;
    }

    return distribution;
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
   * Estimate the number of concepts that can be extracted from content
   */
  estimateConceptCount(content: string): { min: number; max: number; recommended: number } {
    const wordCount = content.split(/\s+/).length;
    const paragraphCount = (content.match(/\n\n/g) || []).length + 1;

    // Heuristic: roughly 1 concept per 200-300 words
    const byWords = Math.floor(wordCount / 250);
    const byParagraphs = Math.floor(paragraphCount * 2);

    const estimated = Math.max(byWords, byParagraphs);

    return {
      min: Math.max(5, Math.floor(estimated * 0.5)),
      max: Math.min(50, Math.ceil(estimated * 1.5)),
      recommended: Math.max(10, Math.min(30, estimated)),
    };
  }
}

export const conceptExtractionService = new ConceptExtractionService();
