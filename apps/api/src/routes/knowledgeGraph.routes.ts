import { Router, Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { knowledgeGraphController } from '../controllers/knowledgeGraph.controller';
import { authenticateToken, requireFeature } from '../middleware/auth.middleware';

const router = Router();

// Rate limiting for AI extraction (more restrictive due to API costs)
const extractionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 extraction requests per window
  message: { error: 'Too many extraction requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for semantic search
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 search requests per minute
  message: { error: 'Too many search requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All routes require authentication and knowledge_graph feature (premium)
router.use(authenticateToken);
router.use(requireFeature('knowledge_graph'));

// ============================================
// CONCEPTS
// ============================================

// POST /api/knowledge-graph/concepts - Create a new concept
router.post('/concepts', (req: Request, res: Response, next: NextFunction) =>
  knowledgeGraphController.createConcept(req, res, next)
);

// GET /api/knowledge-graph/concepts - Get all concepts for current user
router.get('/concepts', (req: Request, res: Response, next: NextFunction) =>
  knowledgeGraphController.getConcepts(req, res, next)
);

// GET /api/knowledge-graph/concepts/:id - Get a specific concept
router.get('/concepts/:id', (req: Request, res: Response, next: NextFunction) =>
  knowledgeGraphController.getConcept(req, res, next)
);

// PUT /api/knowledge-graph/concepts/:id - Update a concept
router.put('/concepts/:id', (req: Request, res: Response, next: NextFunction) =>
  knowledgeGraphController.updateConcept(req, res, next)
);

// DELETE /api/knowledge-graph/concepts/:id - Delete a concept
router.delete('/concepts/:id', (req: Request, res: Response, next: NextFunction) =>
  knowledgeGraphController.deleteConcept(req, res, next)
);

// GET /api/knowledge-graph/concepts/:id/similar - Find similar concepts
router.get('/concepts/:id/similar', (req: Request, res: Response, next: NextFunction) =>
  knowledgeGraphController.findSimilar(req, res, next)
);

// ============================================
// RELATIONSHIPS
// ============================================

// POST /api/knowledge-graph/relationships - Create a relationship
router.post('/relationships', (req: Request, res: Response, next: NextFunction) =>
  knowledgeGraphController.createRelationship(req, res, next)
);

// PUT /api/knowledge-graph/relationships/:id - Update a relationship
router.put('/relationships/:id', (req: Request, res: Response, next: NextFunction) =>
  knowledgeGraphController.updateRelationship(req, res, next)
);

// DELETE /api/knowledge-graph/relationships/:id - Delete a relationship
router.delete('/relationships/:id', (req: Request, res: Response, next: NextFunction) =>
  knowledgeGraphController.deleteRelationship(req, res, next)
);

// ============================================
// AI EXTRACTION
// ============================================

// POST /api/knowledge-graph/extract - Extract concepts from an upload
router.post(
  '/extract',
  extractionLimiter,
  (req: Request, res: Response, next: NextFunction) =>
    knowledgeGraphController.extractFromUpload(req, res, next)
);

// ============================================
// SEMANTIC SEARCH
// ============================================

// POST /api/knowledge-graph/search - Semantic search across concepts
router.post(
  '/search',
  searchLimiter,
  (req: Request, res: Response, next: NextFunction) =>
    knowledgeGraphController.semanticSearch(req, res, next)
);

// ============================================
// VISUALIZATION & STATISTICS
// ============================================

// GET /api/knowledge-graph/graph - Get graph data for visualization
router.get('/graph', (req: Request, res: Response, next: NextFunction) =>
  knowledgeGraphController.getGraph(req, res, next)
);

// GET /api/knowledge-graph/strengths - Get concept strength scores
router.get('/strengths', (req: Request, res: Response, next: NextFunction) =>
  knowledgeGraphController.getConceptStrengths(req, res, next)
);

// GET /api/knowledge-graph/stats - Get knowledge graph statistics
router.get('/stats', (req: Request, res: Response, next: NextFunction) =>
  knowledgeGraphController.getStats(req, res, next)
);

export default router;
