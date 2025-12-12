import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/upload.routes';
import flashcardRoutes from './routes/flashcard.routes';
import quizRoutes from './routes/quiz.routes';
import knowledgeGraphRoutes from './routes/knowledgeGraph.routes';
import betaRoutes from './routes/beta.routes';
import subscriptionRoutes from './routes/subscription.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);

app.use('/api/content', (_req, res) => {
  res.json({ message: 'Content routes coming soon' });
});

// Flashcard routes with AI generation
app.use('/api/flashcards', flashcardRoutes);

// Quiz routes with AI generation
app.use('/api/quizzes', quizRoutes);

// Knowledge Graph routes with AI extraction
app.use('/api/knowledge-graph', knowledgeGraphRoutes);

// Beta Testing Program routes
app.use('/api/beta', betaRoutes);

// Subscription and Payment routes
app.use('/api/subscriptions', subscriptionRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  const statusCode = (err as Error & { status?: number }).status || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});