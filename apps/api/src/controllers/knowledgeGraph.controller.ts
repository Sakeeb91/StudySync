import { Request, Response, NextFunction } from 'express';
import { PrismaClient, ConceptEntityType, RelationshipType } from '@prisma/client';
import { z } from 'zod';
import {
  createConceptSchema,
  updateConceptSchema,
  createRelationshipSchema,
  updateRelationshipSchema,
  extractConceptsSchema,
  semanticSearchSchema,
} from '@studysync/auth';
import { conceptExtractionService } from '../services/conceptExtraction.service';
import { embeddingService } from '../services/embedding.service';
import {
  KnowledgeGraphData,
  GraphNode,
  GraphEdge,
  ConceptStrength,
} from '../services/knowledgeGraph.types';

const prisma = new PrismaClient();

export class KnowledgeGraphController {
  // ============================================
  // CONCEPT CRUD OPERATIONS
  // ============================================

  /**
   * Create a new concept manually
   */
  async createConcept(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = createConceptSchema.parse(req.body);

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

      // Check for duplicate concept name for this user and upload
      const existing = await prisma.concept.findFirst({
        where: {
          userId: req.user.userId,
          name: validatedData.name,
          uploadId: validatedData.uploadId || null,
        },
      });

      if (existing) {
        res.status(409).json({ error: 'A concept with this name already exists' });
        return;
      }

      // Generate embedding for the concept
      const embeddingText = embeddingService.generateConceptText(
        validatedData.name,
        validatedData.description || '',
        validatedData.entityType as ConceptEntityType
      );
      const embedding = await embeddingService.generateEmbedding(embeddingText);

      const concept = await prisma.concept.create({
        data: {
          userId: req.user.userId,
          name: validatedData.name,
          description: validatedData.description,
          entityType: validatedData.entityType as ConceptEntityType,
          uploadId: validatedData.uploadId,
          importance: validatedData.importance,
          lectureOrder: validatedData.lectureOrder,
          metadata: validatedData.metadata ? JSON.parse(JSON.stringify(validatedData.metadata)) : undefined,
          embedding,
        },
        include: {
          upload: { select: { id: true, originalName: true } },
          _count: { select: { outgoingRelations: true, incomingRelations: true } },
        },
      });

      res.status(201).json({
        message: 'Concept created successfully',
        concept,
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
   * Get all concepts for current user
   */
  async getConcepts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const search = req.query.search as string | undefined;
      const entityType = req.query.entityType as ConceptEntityType | undefined;
      const uploadId = req.query.uploadId as string | undefined;

      const where: Record<string, unknown> = { userId: req.user.userId };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (entityType) {
        where.entityType = entityType;
      }

      if (uploadId) {
        where.uploadId = uploadId;
      }

      const [concepts, total] = await Promise.all([
        prisma.concept.findMany({
          where,
          orderBy: [{ importance: 'desc' }, { name: 'asc' }],
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            name: true,
            description: true,
            entityType: true,
            importance: true,
            lectureOrder: true,
            createdAt: true,
            updatedAt: true,
            upload: { select: { id: true, originalName: true } },
            _count: { select: { outgoingRelations: true, incomingRelations: true } },
          },
        }),
        prisma.concept.count({ where }),
      ]);

      res.json({
        concepts,
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
   * Get a specific concept with its relationships
   */
  async getConcept(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      const concept = await prisma.concept.findFirst({
        where: { id, userId: req.user.userId },
        include: {
          upload: { select: { id: true, originalName: true } },
          outgoingRelations: {
            include: {
              toConcept: { select: { id: true, name: true, entityType: true } },
            },
          },
          incomingRelations: {
            include: {
              fromConcept: { select: { id: true, name: true, entityType: true } },
            },
          },
        },
      });

      if (!concept) {
        res.status(404).json({ error: 'Concept not found' });
        return;
      }

      res.json({ concept });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a concept
   */
  async updateConcept(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const validatedData = updateConceptSchema.parse(req.body);

      const existing = await prisma.concept.findFirst({
        where: { id, userId: req.user.userId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Concept not found' });
        return;
      }

      // Regenerate embedding if name or description changed
      let embedding = existing.embedding;
      if (validatedData.name || validatedData.description !== undefined || validatedData.entityType) {
        const newName = validatedData.name || existing.name;
        const newDescription = validatedData.description !== undefined ? (validatedData.description || '') : (existing.description || '');
        const newEntityType = validatedData.entityType || existing.entityType;

        const embeddingText = embeddingService.generateConceptText(newName, newDescription, newEntityType);
        embedding = await embeddingService.generateEmbedding(embeddingText);
      }

      // Prepare update data, handling metadata JSON conversion
      const updateData: Record<string, unknown> = {
        ...validatedData,
        embedding,
      };
      if (validatedData.metadata !== undefined) {
        updateData.metadata = validatedData.metadata ? JSON.parse(JSON.stringify(validatedData.metadata)) : null;
      }

      const updated = await prisma.concept.update({
        where: { id },
        data: updateData,
        include: {
          upload: { select: { id: true, originalName: true } },
          _count: { select: { outgoingRelations: true, incomingRelations: true } },
        },
      });

      res.json({
        message: 'Concept updated successfully',
        concept: updated,
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
   * Delete a concept
   */
  async deleteConcept(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      const existing = await prisma.concept.findFirst({
        where: { id, userId: req.user.userId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Concept not found' });
        return;
      }

      await prisma.concept.delete({ where: { id } });

      res.json({ message: 'Concept deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // RELATIONSHIP CRUD OPERATIONS
  // ============================================

  /**
   * Create a relationship between concepts
   */
  async createRelationship(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = createRelationshipSchema.parse(req.body);

      // Verify both concepts belong to user
      const [fromConcept, toConcept] = await Promise.all([
        prisma.concept.findFirst({
          where: { id: validatedData.fromConceptId, userId: req.user.userId },
        }),
        prisma.concept.findFirst({
          where: { id: validatedData.toConceptId, userId: req.user.userId },
        }),
      ]);

      if (!fromConcept || !toConcept) {
        res.status(404).json({ error: 'One or both concepts not found' });
        return;
      }

      // Prevent self-referencing
      if (validatedData.fromConceptId === validatedData.toConceptId) {
        res.status(400).json({ error: 'Cannot create a relationship from a concept to itself' });
        return;
      }

      // Check for existing relationship
      const existing = await prisma.conceptRelationship.findFirst({
        where: {
          fromConceptId: validatedData.fromConceptId,
          toConceptId: validatedData.toConceptId,
          relationshipType: validatedData.relationshipType as RelationshipType,
        },
      });

      if (existing) {
        res.status(409).json({ error: 'This relationship already exists' });
        return;
      }

      const relationship = await prisma.conceptRelationship.create({
        data: {
          fromConceptId: validatedData.fromConceptId,
          toConceptId: validatedData.toConceptId,
          relationshipType: validatedData.relationshipType as RelationshipType,
          strength: validatedData.strength,
          description: validatedData.description,
          bidirectional: validatedData.bidirectional,
        },
        include: {
          fromConcept: { select: { id: true, name: true, entityType: true } },
          toConcept: { select: { id: true, name: true, entityType: true } },
        },
      });

      res.status(201).json({
        message: 'Relationship created successfully',
        relationship,
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
   * Update a relationship
   */
  async updateRelationship(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const validatedData = updateRelationshipSchema.parse(req.body);

      // Verify relationship exists and user owns the concepts
      const existing = await prisma.conceptRelationship.findFirst({
        where: { id },
        include: {
          fromConcept: { select: { userId: true } },
        },
      });

      if (!existing || existing.fromConcept.userId !== req.user.userId) {
        res.status(404).json({ error: 'Relationship not found' });
        return;
      }

      const updated = await prisma.conceptRelationship.update({
        where: { id },
        data: validatedData,
        include: {
          fromConcept: { select: { id: true, name: true, entityType: true } },
          toConcept: { select: { id: true, name: true, entityType: true } },
        },
      });

      res.json({
        message: 'Relationship updated successfully',
        relationship: updated,
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
   * Delete a relationship
   */
  async deleteRelationship(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      // Verify relationship exists and user owns the concepts
      const existing = await prisma.conceptRelationship.findFirst({
        where: { id },
        include: {
          fromConcept: { select: { userId: true } },
        },
      });

      if (!existing || existing.fromConcept.userId !== req.user.userId) {
        res.status(404).json({ error: 'Relationship not found' });
        return;
      }

      await prisma.conceptRelationship.delete({ where: { id } });

      res.json({ message: 'Relationship deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // AI EXTRACTION
  // ============================================

  /**
   * Extract concepts from an upload using AI
   */
  async extractFromUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = extractConceptsSchema.parse(req.body);

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

      // Extract concepts using AI
      const result = await conceptExtractionService.extractFromText(
        upload.extractedText,
        validatedData.options
      );

      if (result.concepts.length === 0) {
        res.status(400).json({ error: 'Could not extract concepts from this content' });
        return;
      }

      // Generate embeddings for all concepts
      const conceptTexts = result.concepts.map(c =>
        embeddingService.generateConceptText(c.name, c.description, c.entityType)
      );
      const embeddings = await embeddingService.generateEmbeddings(conceptTexts);

      // Create concepts in database
      const createdConcepts: { id: string; name: string }[] = [];

      for (let i = 0; i < result.concepts.length; i++) {
        const c = result.concepts[i];
        try {
          const concept = await prisma.concept.upsert({
            where: {
              userId_name_uploadId: {
                userId: req.user.userId,
                name: c.name,
                uploadId: upload.id,
              },
            },
            update: {
              description: c.description,
              entityType: c.entityType,
              importance: c.importance,
              embedding: embeddings[i],
            },
            create: {
              userId: req.user.userId,
              uploadId: upload.id,
              name: c.name,
              description: c.description,
              entityType: c.entityType,
              importance: c.importance,
              embedding: embeddings[i],
              lectureOrder: i,
            },
          });
          createdConcepts.push({ id: concept.id, name: concept.name });
        } catch {
          // Skip duplicates
          console.warn(`Skipping duplicate concept: ${c.name}`);
        }
      }

      // Create relationships
      const conceptNameToId = new Map(createdConcepts.map(c => [c.name.toLowerCase(), c.id]));
      let relationshipsCreated = 0;

      for (const r of result.relationships) {
        const fromId = conceptNameToId.get(r.fromConceptName.toLowerCase());
        const toId = conceptNameToId.get(r.toConceptName.toLowerCase());

        if (fromId && toId && fromId !== toId) {
          try {
            await prisma.conceptRelationship.upsert({
              where: {
                fromConceptId_toConceptId_relationshipType: {
                  fromConceptId: fromId,
                  toConceptId: toId,
                  relationshipType: r.relationshipType,
                },
              },
              update: {
                strength: r.strength,
                description: r.description,
                bidirectional: r.bidirectional,
              },
              create: {
                fromConceptId: fromId,
                toConceptId: toId,
                relationshipType: r.relationshipType,
                strength: r.strength,
                description: r.description,
                bidirectional: r.bidirectional,
              },
            });
            relationshipsCreated++;
          } catch {
            // Skip duplicate relationships
          }
        }
      }

      res.status(201).json({
        message: 'Concepts extracted successfully',
        extraction: {
          conceptsCreated: createdConcepts.length,
          relationshipsCreated,
          topicSummary: result.metadata.topicSummary,
          processingTimeMs: result.metadata.processingTimeMs,
          entityTypeDistribution: result.metadata.entityTypeDistribution,
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

  // ============================================
  // SEMANTIC SEARCH
  // ============================================

  /**
   * Search concepts semantically
   */
  async semanticSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = semanticSearchSchema.parse(req.body);

      const results = await embeddingService.semanticSearch(
        req.user.userId,
        validatedData.query,
        validatedData.options
      );

      res.json({
        query: validatedData.query,
        results,
        total: results.length,
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
   * Find similar concepts to a given concept
   */
  async findSimilar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      // Verify concept belongs to user
      const concept = await prisma.concept.findFirst({
        where: { id, userId: req.user.userId },
        select: { name: true },
      });

      if (!concept) {
        res.status(404).json({ error: 'Concept not found' });
        return;
      }

      const results = await embeddingService.findSimilarConcepts(id, req.user.userId, limit);

      res.json({
        concept: concept.name,
        similar: results,
        total: results.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // KNOWLEDGE GRAPH VISUALIZATION
  // ============================================

  /**
   * Get knowledge graph data for visualization
   */
  async getGraph(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const uploadId = req.query.uploadId as string | undefined;
      const entityTypes = req.query.entityTypes
        ? (req.query.entityTypes as string).split(',') as ConceptEntityType[]
        : undefined;
      const minImportance = parseFloat(req.query.minImportance as string) || 0;

      // Build where clause
      const where: Record<string, unknown> = { userId: req.user.userId };
      if (uploadId) {
        where.uploadId = uploadId;
      }
      if (entityTypes && entityTypes.length > 0) {
        where.entityType = { in: entityTypes };
      }
      if (minImportance > 0) {
        where.importance = { gte: minImportance };
      }

      // Fetch concepts (nodes)
      const concepts = await prisma.concept.findMany({
        where,
        select: {
          id: true,
          name: true,
          entityType: true,
          importance: true,
          description: true,
          uploadId: true,
          upload: { select: { originalName: true } },
        },
      });

      const conceptIds = concepts.map(c => c.id);

      // Fetch relationships (edges) between these concepts
      const relationships = await prisma.conceptRelationship.findMany({
        where: {
          OR: [
            { fromConceptId: { in: conceptIds } },
            { toConceptId: { in: conceptIds } },
          ],
        },
        select: {
          id: true,
          fromConceptId: true,
          toConceptId: true,
          relationshipType: true,
          strength: true,
          bidirectional: true,
        },
      });

      // Filter to only include edges where both nodes are in our set
      const conceptIdSet = new Set(conceptIds);
      const filteredRelationships = relationships.filter(
        r => conceptIdSet.has(r.fromConceptId) && conceptIdSet.has(r.toConceptId)
      );

      // Build graph data
      const nodes: GraphNode[] = concepts.map(c => ({
        id: c.id,
        name: c.name,
        entityType: c.entityType,
        importance: c.importance,
        description: c.description || undefined,
        uploadId: c.uploadId || undefined,
        uploadName: c.upload?.originalName,
      }));

      const edges: GraphEdge[] = filteredRelationships.map(r => ({
        id: r.id,
        source: r.fromConceptId,
        target: r.toConceptId,
        relationshipType: r.relationshipType,
        strength: r.strength,
        bidirectional: r.bidirectional,
      }));

      // Calculate metadata
      const entityTypeDistribution: Record<string, number> = {};
      for (const node of nodes) {
        entityTypeDistribution[node.entityType] = (entityTypeDistribution[node.entityType] || 0) + 1;
      }

      const relationshipTypeDistribution: Record<string, number> = {};
      for (const edge of edges) {
        relationshipTypeDistribution[edge.relationshipType] = (relationshipTypeDistribution[edge.relationshipType] || 0) + 1;
      }

      const graphData: KnowledgeGraphData = {
        nodes,
        edges,
        metadata: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          entityTypeDistribution,
          relationshipTypeDistribution,
        },
      };

      res.json(graphData);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // CONCEPT STRENGTH & STATISTICS
  // ============================================

  /**
   * Get concept strength scores
   */
  async getConceptStrengths(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const uploadId = req.query.uploadId as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      // Build where clause
      const where: Record<string, unknown> = { userId: req.user.userId };
      if (uploadId) {
        where.uploadId = uploadId;
      }

      // Fetch concepts with relationship counts
      const concepts = await prisma.concept.findMany({
        where,
        select: {
          id: true,
          name: true,
          importance: true,
          _count: {
            select: {
              outgoingRelations: true,
              incomingRelations: true,
            },
          },
          outgoingRelations: {
            select: {
              strength: true,
              relationshipType: true,
            },
          },
          incomingRelations: {
            select: {
              strength: true,
              relationshipType: true,
            },
          },
        },
      });

      // Calculate strength scores
      const strengths: ConceptStrength[] = concepts.map(c => {
        const allRelations = [...c.outgoingRelations, ...c.incomingRelations];
        const connectionCount = c._count.outgoingRelations + c._count.incomingRelations;
        const avgStrength = connectionCount > 0
          ? allRelations.reduce((sum, r) => sum + r.strength, 0) / connectionCount
          : 0;

        const isPrerequisiteFor = c.outgoingRelations.filter(
          r => r.relationshipType === 'PREREQUISITE'
        ).length;
        const hasPrerequisites = c.incomingRelations.filter(
          r => r.relationshipType === 'PREREQUISITE'
        ).length;

        // Overall strength: weighted combination of metrics
        const overallStrength = Math.min(1, (
          (c.importance * 0.3) +
          (Math.min(connectionCount / 10, 1) * 0.3) +
          (avgStrength * 0.2) +
          (Math.min(isPrerequisiteFor / 5, 1) * 0.2)
        ));

        return {
          conceptId: c.id,
          name: c.name,
          overallStrength: Math.round(overallStrength * 100) / 100,
          metrics: {
            connectionCount,
            averageRelationshipStrength: Math.round(avgStrength * 100) / 100,
            importance: c.importance,
            isPrerequisiteFor,
            hasPrerequisites,
          },
        };
      });

      // Sort by overall strength and limit
      const sorted = strengths.sort((a, b) => b.overallStrength - a.overallStrength).slice(0, limit);

      res.json({
        strengths: sorted,
        total: concepts.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get knowledge graph statistics
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const [
        totalConcepts,
        totalRelationships,
        conceptsByEntityType,
        conceptsByUpload,
        avgImportance,
      ] = await Promise.all([
        prisma.concept.count({ where: { userId: req.user.userId } }),
        prisma.conceptRelationship.count({
          where: {
            fromConcept: { userId: req.user.userId },
          },
        }),
        prisma.concept.groupBy({
          by: ['entityType'],
          where: { userId: req.user.userId },
          _count: true,
        }),
        prisma.concept.groupBy({
          by: ['uploadId'],
          where: { userId: req.user.userId },
          _count: true,
        }),
        prisma.concept.aggregate({
          where: { userId: req.user.userId },
          _avg: { importance: true },
        }),
      ]);

      res.json({
        stats: {
          totalConcepts,
          totalRelationships,
          averageImportance: avgImportance._avg.importance
            ? Math.round(avgImportance._avg.importance * 100) / 100
            : 0,
          uploadsWithConcepts: conceptsByUpload.filter(u => u.uploadId !== null).length,
        },
        entityTypeDistribution: Object.fromEntries(
          conceptsByEntityType.map(e => [e.entityType, e._count])
        ),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const knowledgeGraphController = new KnowledgeGraphController();
