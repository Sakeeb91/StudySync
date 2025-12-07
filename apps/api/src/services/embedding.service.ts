import OpenAI from 'openai';
import { SemanticSearchResult, SemanticSearchOptions } from './knowledgeGraph.types';
import { PrismaClient, ConceptEntityType } from '@prisma/client';

const prisma = new PrismaClient();

export class EmbeddingService {
  private openai: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set. Embedding generation will not work.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key-for-init',
    });

    // Use text-embedding-3-small for cost-effective embeddings
    this.model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  }

  /**
   * Generate embedding vector for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    // Truncate text if too long (embedding models have token limits)
    const truncatedText = text.slice(0, 8000);

    const response = await this.openai.embeddings.create({
      model: this.model,
      input: truncatedText,
    });

    return response.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    if (texts.length === 0) {
      return [];
    }

    // Truncate each text if too long
    const truncatedTexts = texts.map(t => t.slice(0, 8000));

    // OpenAI supports batch embeddings (up to 2048 inputs)
    const batches: string[][] = [];
    for (let i = 0; i < truncatedTexts.length; i += 100) {
      batches.push(truncatedTexts.slice(i, i + 100));
    }

    const allEmbeddings: number[][] = [];

    for (const batch of batches) {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: batch,
      });

      const batchEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map(d => d.embedding);

      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Perform semantic search across concepts
   */
  async semanticSearch(
    userId: string,
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    const {
      limit = 10,
      minSimilarity = 0.5,
      entityTypes,
      uploadId,
    } = options;

    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);

    // Build where clause
    const where: Record<string, unknown> = { userId };
    if (uploadId) {
      where.uploadId = uploadId;
    }
    if (entityTypes && entityTypes.length > 0) {
      where.entityType = { in: entityTypes };
    }

    // Fetch all concepts with embeddings
    const concepts = await prisma.concept.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        entityType: true,
        embedding: true,
        upload: {
          select: {
            id: true,
            originalName: true,
          },
        },
      },
    });

    // Calculate similarities and filter
    const results: SemanticSearchResult[] = [];

    for (const concept of concepts) {
      if (!concept.embedding || concept.embedding.length === 0) {
        continue;
      }

      const similarity = this.calculateCosineSimilarity(queryEmbedding, concept.embedding);

      if (similarity >= minSimilarity) {
        results.push({
          conceptId: concept.id,
          name: concept.name,
          description: concept.description,
          entityType: concept.entityType,
          similarity: Math.round(similarity * 1000) / 1000,
          uploadName: concept.upload?.originalName,
        });
      }
    }

    // Sort by similarity (highest first) and limit
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Find similar concepts to a given concept
   */
  async findSimilarConcepts(
    conceptId: string,
    userId: string,
    limit: number = 10
  ): Promise<SemanticSearchResult[]> {
    // Get the source concept
    const sourceConcept = await prisma.concept.findFirst({
      where: { id: conceptId, userId },
      select: { embedding: true, name: true },
    });

    if (!sourceConcept || !sourceConcept.embedding || sourceConcept.embedding.length === 0) {
      return [];
    }

    // Fetch all other concepts
    const concepts = await prisma.concept.findMany({
      where: {
        userId,
        id: { not: conceptId },
      },
      select: {
        id: true,
        name: true,
        description: true,
        entityType: true,
        embedding: true,
        upload: {
          select: {
            id: true,
            originalName: true,
          },
        },
      },
    });

    // Calculate similarities
    const results: SemanticSearchResult[] = [];

    for (const concept of concepts) {
      if (!concept.embedding || concept.embedding.length === 0) {
        continue;
      }

      const similarity = this.calculateCosineSimilarity(
        sourceConcept.embedding,
        concept.embedding
      );

      results.push({
        conceptId: concept.id,
        name: concept.name,
        description: concept.description,
        entityType: concept.entityType,
        similarity: Math.round(similarity * 1000) / 1000,
        uploadName: concept.upload?.originalName,
      });
    }

    // Sort by similarity (highest first) and limit
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Generate text representation for embedding a concept
   */
  generateConceptText(name: string, description: string, entityType: ConceptEntityType): string {
    return `${entityType}: ${name}. ${description}`;
  }
}

export const embeddingService = new EmbeddingService();
