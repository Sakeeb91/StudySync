import { ConceptEntityType, RelationshipType } from '@prisma/client';

// Types for concept extraction
export interface ExtractedConcept {
  name: string;
  description: string;
  entityType: ConceptEntityType;
  importance: number; // 0-1 scale
  context?: string; // The context in which the concept was found
}

export interface ExtractedRelationship {
  fromConceptName: string;
  toConceptName: string;
  relationshipType: RelationshipType;
  strength: number; // 0-1 scale
  description?: string;
  bidirectional: boolean;
}

export interface ConceptExtractionResult {
  concepts: ExtractedConcept[];
  relationships: ExtractedRelationship[];
  metadata: {
    totalConcepts: number;
    totalRelationships: number;
    processingTimeMs: number;
    topicSummary: string;
    entityTypeDistribution: Record<ConceptEntityType, number>;
  };
}

export interface ConceptExtractionOptions {
  maxConcepts?: number;
  minImportance?: number;
  focusEntityTypes?: ConceptEntityType[];
  extractRelationships?: boolean;
  includeContext?: boolean;
}

// Types for semantic search
export interface SemanticSearchResult {
  conceptId: string;
  name: string;
  description: string | null;
  entityType: ConceptEntityType;
  similarity: number;
  uploadName?: string;
}

export interface SemanticSearchOptions {
  limit?: number;
  minSimilarity?: number;
  entityTypes?: ConceptEntityType[];
  uploadId?: string;
}

// Types for knowledge graph visualization
export interface GraphNode {
  id: string;
  name: string;
  entityType: ConceptEntityType;
  importance: number;
  description?: string;
  uploadId?: string;
  uploadName?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: RelationshipType;
  strength: number;
  bidirectional: boolean;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    entityTypeDistribution: Record<string, number>;
    relationshipTypeDistribution: Record<string, number>;
  };
}

// Types for concept strength scoring
export interface ConceptStrength {
  conceptId: string;
  name: string;
  overallStrength: number;
  metrics: {
    connectionCount: number;
    averageRelationshipStrength: number;
    importance: number;
    isPrerequisiteFor: number;
    hasPrerequisites: number;
  };
}
