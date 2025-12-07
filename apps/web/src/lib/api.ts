// API client for StudySync backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Types for API responses
export interface ApiError {
  error: string;
  details?: unknown;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Quiz types
export interface Quiz {
  id: string;
  userId: string;
  uploadId?: string;
  title: string;
  description?: string;
  timeLimit?: number;
  passingScore: number;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    questions: number;
    attempts: number;
  };
  upload?: {
    id: string;
    originalName: string;
  };
  questions?: Question[];
  bestScore?: number | null;
  lastAttempt?: string | null;
}

export interface Question {
  id: string;
  quizId: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  question: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
  order: number;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  timeSpent: number;
  completed: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface Answer {
  questionId: string;
  userAnswer: string;
}

// Generic fetch wrapper with auth
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }

  return data;
}

// ============================================
// QUIZ API FUNCTIONS
// ============================================

export interface GetQuizzesParams {
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
}

export interface GetQuizzesResponse {
  quizzes: Quiz[];
  pagination: PaginationInfo;
}

export async function getQuizzes(params: GetQuizzesParams = {}): Promise<GetQuizzesResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.tag) searchParams.set('tag', params.tag);

  const query = searchParams.toString();
  return fetchApi<GetQuizzesResponse>(`/quizzes${query ? `?${query}` : ''}`);
}

export interface CreateQuizParams {
  title: string;
  description?: string;
  uploadId?: string;
  timeLimit?: number;
  passingScore?: number;
  isPublic?: boolean;
  tags?: string[];
}

export async function createQuiz(params: CreateQuizParams): Promise<{ message: string; quiz: Quiz }> {
  return fetchApi('/quizzes', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface GetQuizResponse {
  quiz: Quiz;
  stats: {
    totalAttempts: number;
    bestScore: number | null;
    averageScore: number | null;
    lastAttempt: QuizAttempt | null;
  };
}

export async function getQuiz(id: string): Promise<GetQuizResponse> {
  return fetchApi<GetQuizResponse>(`/quizzes/${id}`);
}

export async function updateQuiz(id: string, params: Partial<CreateQuizParams>): Promise<{ message: string; quiz: Quiz }> {
  return fetchApi(`/quizzes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(params),
  });
}

export async function deleteQuiz(id: string): Promise<{ message: string }> {
  return fetchApi(`/quizzes/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// QUIZ GENERATION
// ============================================

export interface GenerateQuizParams {
  uploadId: string;
  options?: {
    maxQuestions?: number;
    minQuestions?: number;
    difficulty?: 'mixed' | 'easy' | 'medium' | 'hard';
    questionTypes?: ('MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY')[];
    focusTopics?: string[];
    includeExplanations?: boolean;
  };
  title?: string;
  description?: string;
  timeLimit?: number;
}

export interface GenerationMetadata {
  totalGenerated: number;
  averageQualityScore: number;
  topics: string[];
  processingTimeMs: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface GenerateQuizResponse {
  message: string;
  quiz: Quiz;
  generation: GenerationMetadata;
}

export async function generateQuiz(params: GenerateQuizParams): Promise<GenerateQuizResponse> {
  return fetchApi('/quizzes/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function regenerateQuestions(
  quizId: string,
  options?: GenerateQuizParams['options']
): Promise<{ message: string; generation: GenerationMetadata }> {
  return fetchApi(`/quizzes/${quizId}/regenerate`, {
    method: 'POST',
    body: JSON.stringify({ options }),
  });
}

// ============================================
// QUIZ ATTEMPTS
// ============================================

export interface StartAttemptResponse {
  message: string;
  attempt: QuizAttempt;
  quiz: {
    id: string;
    title: string;
    description?: string;
    timeLimit?: number;
    passingScore: number;
    questions: Question[];
  };
}

export async function startQuizAttempt(quizId: string): Promise<StartAttemptResponse> {
  return fetchApi(`/quizzes/${quizId}/attempt`, {
    method: 'POST',
  });
}

export async function submitAnswer(
  quizId: string,
  attemptId: string,
  answer: Answer
): Promise<{ message: string; answer: { id: string; questionId: string; userAnswer: string } }> {
  return fetchApi(`/quizzes/${quizId}/attempt/${attemptId}/answer`, {
    method: 'POST',
    body: JSON.stringify(answer),
  });
}

export interface SubmitQuizParams {
  answers: Answer[];
  timeSpent: number;
}

export interface AnswerResult {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  explanation?: string;
}

export interface SubmitQuizResponse {
  message: string;
  result: {
    attempt: QuizAttempt;
    score: number;
    totalPoints: number;
    earnedPoints: number;
    passed: boolean;
    passingScore: number;
    answers: AnswerResult[];
    summary: {
      total: number;
      correct: number;
      incorrect: number;
    };
  };
}

export async function submitQuiz(
  quizId: string,
  attemptId: string,
  params: SubmitQuizParams
): Promise<SubmitQuizResponse> {
  return fetchApi(`/quizzes/${quizId}/attempt/${attemptId}/submit`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface AttemptResultsResponse {
  attempt: {
    id: string;
    score: number;
    timeSpent: number;
    completed: boolean;
    startedAt: string;
    completedAt?: string;
  };
  quiz: {
    id: string;
    title: string;
    passingScore: number;
  };
  results: Array<{
    question: Question;
    userAnswer: string | null;
    isCorrect: boolean;
    earnedPoints: number;
  }>;
  summary: {
    total: number;
    correct: number;
    incorrect: number;
    passed: boolean;
  };
}

export async function getAttemptResults(quizId: string, attemptId: string): Promise<AttemptResultsResponse> {
  return fetchApi(`/quizzes/${quizId}/attempts/${attemptId}`);
}

export interface GetAttemptsParams {
  page?: number;
  limit?: number;
}

export interface GetAttemptsResponse {
  attempts: QuizAttempt[];
  pagination: PaginationInfo;
  stats: {
    totalAttempts: number;
    completedAttempts: number;
    bestScore: number | null;
    averageScore: number | null;
    averageTime: number | null;
  };
}

export async function getQuizAttempts(quizId: string, params: GetAttemptsParams = {}): Promise<GetAttemptsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const query = searchParams.toString();
  return fetchApi(`/quizzes/${quizId}/attempts${query ? `?${query}` : ''}`);
}

// ============================================
// QUIZ STATISTICS
// ============================================

export interface QuizStatsResponse {
  quiz: {
    id: string;
    title: string;
    totalQuestions: number;
    totalAttempts: number;
  };
  overallStats: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    averageTime: number;
  };
  questionStats: Array<{
    questionId: string;
    question: string;
    type: string;
    totalAnswers: number;
    correctAnswers: number;
    accuracy: number;
  }>;
  hardestQuestions: Array<{ questionId: string; question: string; accuracy: number }>;
  easiestQuestions: Array<{ questionId: string; question: string; accuracy: number }>;
}

export async function getQuizStats(quizId: string): Promise<QuizStatsResponse> {
  return fetchApi(`/quizzes/${quizId}/stats`);
}

export interface UserQuizStatsResponse {
  stats: {
    totalQuizzes: number;
    totalAttempts: number;
    averageScore: number;
    bestScore: number;
    averageTime: number;
  };
  recentAttempts: Array<{
    id: string;
    quizId: string;
    quizTitle: string;
    score: number;
    timeSpent: number;
    completedAt: string;
  }>;
}

export async function getUserQuizStats(): Promise<UserQuizStatsResponse> {
  return fetchApi('/quizzes/stats');
}

// ============================================
// QUESTIONS
// ============================================

export interface CreateQuestionParams {
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  points?: number;
  order: number;
}

export async function addQuestion(
  quizId: string,
  params: CreateQuestionParams
): Promise<{ message: string; question: Question }> {
  return fetchApi(`/quizzes/${quizId}/questions`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function addQuestions(
  quizId: string,
  questions: CreateQuestionParams[]
): Promise<{ message: string; count: number }> {
  return fetchApi(`/quizzes/${quizId}/questions/batch`, {
    method: 'POST',
    body: JSON.stringify({ questions }),
  });
}

export async function updateQuestion(
  quizId: string,
  questionId: string,
  params: Partial<CreateQuestionParams>
): Promise<{ message: string; question: Question }> {
  return fetchApi(`/quizzes/${quizId}/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(params),
  });
}

export async function deleteQuestion(quizId: string, questionId: string): Promise<{ message: string }> {
  return fetchApi(`/quizzes/${quizId}/questions/${questionId}`, {
    method: 'DELETE',
  });
}

// ============================================
// UPLOADS API (for quiz generation)
// ============================================

export interface Upload {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  extractedText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetUploadsResponse {
  uploads: Upload[];
  pagination: PaginationInfo;
}

export async function getUploads(params: { page?: number; limit?: number; status?: string } = {}): Promise<GetUploadsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  return fetchApi(`/uploads${query ? `?${query}` : ''}`);
}

// ============================================
// KNOWLEDGE GRAPH API FUNCTIONS
// ============================================

// Entity types for concepts
export type ConceptEntityType =
  | 'PERSON'
  | 'THEORY'
  | 'FORMULA'
  | 'EVENT'
  | 'TERM'
  | 'PROCESS'
  | 'PRINCIPLE'
  | 'CONCEPT'
  | 'EXAMPLE'
  | 'DATE';

// Relationship types between concepts
export type RelationshipType =
  | 'PREREQUISITE'
  | 'RELATED'
  | 'OPPOSITE'
  | 'EXAMPLE_OF'
  | 'PART_OF'
  | 'CAUSES'
  | 'DERIVED_FROM'
  | 'SIMILAR_TO'
  | 'APPLIED_IN'
  | 'SUPPORTS';

export interface Concept {
  id: string;
  userId: string;
  uploadId?: string;
  name: string;
  description?: string;
  entityType: ConceptEntityType;
  importance: number;
  lectureOrder?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  upload?: {
    id: string;
    originalName: string;
  };
  _count?: {
    outgoingRelations: number;
    incomingRelations: number;
  };
}

export interface ConceptRelationship {
  id: string;
  fromConceptId: string;
  toConceptId: string;
  relationshipType: RelationshipType;
  strength: number;
  description?: string;
  bidirectional: boolean;
  fromConcept?: { id: string; name: string; entityType: ConceptEntityType };
  toConcept?: { id: string; name: string; entityType: ConceptEntityType };
}

// Concept CRUD

export interface GetConceptsParams {
  page?: number;
  limit?: number;
  search?: string;
  entityType?: ConceptEntityType;
  uploadId?: string;
}

export interface GetConceptsResponse {
  concepts: Concept[];
  pagination: PaginationInfo;
}

export async function getConcepts(params: GetConceptsParams = {}): Promise<GetConceptsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.entityType) searchParams.set('entityType', params.entityType);
  if (params.uploadId) searchParams.set('uploadId', params.uploadId);

  const query = searchParams.toString();
  return fetchApi<GetConceptsResponse>(`/knowledge-graph/concepts${query ? `?${query}` : ''}`);
}

export interface CreateConceptParams {
  name: string;
  description?: string;
  entityType: ConceptEntityType;
  uploadId?: string;
  importance?: number;
  lectureOrder?: number;
  metadata?: Record<string, unknown>;
}

export async function createConcept(params: CreateConceptParams): Promise<{ message: string; concept: Concept }> {
  return fetchApi('/knowledge-graph/concepts', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface GetConceptResponse {
  concept: Concept & {
    outgoingRelations: ConceptRelationship[];
    incomingRelations: ConceptRelationship[];
  };
}

export async function getConcept(id: string): Promise<GetConceptResponse> {
  return fetchApi<GetConceptResponse>(`/knowledge-graph/concepts/${id}`);
}

export async function updateConcept(
  id: string,
  params: Partial<Omit<CreateConceptParams, 'uploadId'>>
): Promise<{ message: string; concept: Concept }> {
  return fetchApi(`/knowledge-graph/concepts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(params),
  });
}

export async function deleteConcept(id: string): Promise<{ message: string }> {
  return fetchApi(`/knowledge-graph/concepts/${id}`, {
    method: 'DELETE',
  });
}

// Relationship CRUD

export interface CreateRelationshipParams {
  fromConceptId: string;
  toConceptId: string;
  relationshipType: RelationshipType;
  strength?: number;
  description?: string;
  bidirectional?: boolean;
}

export async function createRelationship(
  params: CreateRelationshipParams
): Promise<{ message: string; relationship: ConceptRelationship }> {
  return fetchApi('/knowledge-graph/relationships', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function updateRelationship(
  id: string,
  params: Partial<Omit<CreateRelationshipParams, 'fromConceptId' | 'toConceptId'>>
): Promise<{ message: string; relationship: ConceptRelationship }> {
  return fetchApi(`/knowledge-graph/relationships/${id}`, {
    method: 'PUT',
    body: JSON.stringify(params),
  });
}

export async function deleteRelationship(id: string): Promise<{ message: string }> {
  return fetchApi(`/knowledge-graph/relationships/${id}`, {
    method: 'DELETE',
  });
}

// AI Extraction

export interface ExtractConceptsParams {
  uploadId: string;
  options?: {
    maxConcepts?: number;
    minImportance?: number;
    focusEntityTypes?: ConceptEntityType[];
    extractRelationships?: boolean;
    includeContext?: boolean;
  };
}

export interface ExtractionResult {
  message: string;
  extraction: {
    conceptsCreated: number;
    relationshipsCreated: number;
    topicSummary: string;
    processingTimeMs: number;
    entityTypeDistribution: Record<ConceptEntityType, number>;
  };
}

export async function extractConcepts(params: ExtractConceptsParams): Promise<ExtractionResult> {
  return fetchApi('/knowledge-graph/extract', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// Semantic Search

export interface SemanticSearchParams {
  query: string;
  options?: {
    limit?: number;
    minSimilarity?: number;
    entityTypes?: ConceptEntityType[];
    uploadId?: string;
  };
}

export interface SemanticSearchResult {
  conceptId: string;
  name: string;
  description: string | null;
  entityType: ConceptEntityType;
  similarity: number;
  uploadName?: string;
}

export interface SemanticSearchResponse {
  query: string;
  results: SemanticSearchResult[];
  total: number;
}

export async function semanticSearch(params: SemanticSearchParams): Promise<SemanticSearchResponse> {
  return fetchApi('/knowledge-graph/search', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface SimilarConceptsResponse {
  concept: string;
  similar: SemanticSearchResult[];
  total: number;
}

export async function findSimilarConcepts(id: string, limit?: number): Promise<SimilarConceptsResponse> {
  const query = limit ? `?limit=${limit}` : '';
  return fetchApi(`/knowledge-graph/concepts/${id}/similar${query}`);
}

// Knowledge Graph Visualization

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

export interface GetGraphParams {
  uploadId?: string;
  entityTypes?: ConceptEntityType[];
  minImportance?: number;
}

export async function getKnowledgeGraph(params: GetGraphParams = {}): Promise<KnowledgeGraphData> {
  const searchParams = new URLSearchParams();
  if (params.uploadId) searchParams.set('uploadId', params.uploadId);
  if (params.entityTypes) searchParams.set('entityTypes', params.entityTypes.join(','));
  if (params.minImportance) searchParams.set('minImportance', params.minImportance.toString());

  const query = searchParams.toString();
  return fetchApi<KnowledgeGraphData>(`/knowledge-graph/graph${query ? `?${query}` : ''}`);
}

// Concept Strength Scores

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

export interface GetConceptStrengthsParams {
  uploadId?: string;
  limit?: number;
}

export interface ConceptStrengthsResponse {
  strengths: ConceptStrength[];
  total: number;
}

export async function getConceptStrengths(params: GetConceptStrengthsParams = {}): Promise<ConceptStrengthsResponse> {
  const searchParams = new URLSearchParams();
  if (params.uploadId) searchParams.set('uploadId', params.uploadId);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const query = searchParams.toString();
  return fetchApi<ConceptStrengthsResponse>(`/knowledge-graph/strengths${query ? `?${query}` : ''}`);
}

// Knowledge Graph Statistics

export interface KnowledgeGraphStats {
  stats: {
    totalConcepts: number;
    totalRelationships: number;
    averageImportance: number;
    uploadsWithConcepts: number;
  };
  entityTypeDistribution: Record<ConceptEntityType, number>;
}

export async function getKnowledgeGraphStats(): Promise<KnowledgeGraphStats> {
  return fetchApi('/knowledge-graph/stats');
}

// ============================================
// BETA TESTING PROGRAM API FUNCTIONS
// ============================================

// Types
export type BetaApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WAITLISTED';
export type BetaTesterStatus = 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'REMOVED';
export type FeedbackType = 'BUG_REPORT' | 'FEATURE_REQUEST' | 'GENERAL' | 'NPS_SURVEY' | 'USABILITY' | 'PERFORMANCE';
export type FeedbackCategory = 'UPLOAD' | 'FLASHCARDS' | 'QUIZZES' | 'UI_UX' | 'PERFORMANCE' | 'AUTHENTICATION' | 'KNOWLEDGE_GRAPH' | 'OTHER';
export type FeedbackStatus = 'NEW' | 'REVIEWING' | 'IN_PROGRESS' | 'RESOLVED' | 'WONT_FIX' | 'DUPLICATE';

export interface BetaApplication {
  id: string;
  email: string;
  name: string;
  university: string;
  major?: string;
  yearOfStudy?: number;
  studyHoursPerWeek?: number;
  currentTools: string[];
  painPoints?: string;
  referralSource?: string;
  status: BetaApplicationStatus;
  createdAt: string;
  reviewedAt?: string;
}

export interface BetaTester {
  id: string;
  cohort?: string;
  status: BetaTesterStatus;
  featuresEnabled: string[];
  joinedAt: string;
  lastActiveAt: string;
}

export interface BetaFeature {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface BetaFeedback {
  id: string;
  type: FeedbackType;
  category: FeedbackCategory;
  title?: string;
  content: string;
  rating?: number;
  npsScore?: number;
  status: FeedbackStatus;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

// Beta Application Endpoints

export interface SubmitBetaApplicationParams {
  email: string;
  name: string;
  university: string;
  major?: string;
  yearOfStudy?: number;
  studyHoursPerWeek?: number;
  currentTools?: string[];
  painPoints?: string;
  referralSource?: string;
}

export interface SubmitBetaApplicationResponse {
  message: string;
  application: {
    id: string;
    email: string;
    name: string;
    status: BetaApplicationStatus;
    createdAt: string;
  };
}

export async function submitBetaApplication(params: SubmitBetaApplicationParams): Promise<SubmitBetaApplicationResponse> {
  return fetchApi('/beta/apply', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface GetApplicationStatusResponse {
  application: BetaApplication;
}

export async function getBetaApplicationStatus(email: string): Promise<GetApplicationStatusResponse> {
  return fetchApi(`/beta/application/${encodeURIComponent(email)}`);
}

// Beta Tester Status

export interface GetBetaTesterStatusResponse {
  isBetaTester: boolean;
  betaTester?: BetaTester;
}

export async function getBetaTesterStatus(): Promise<GetBetaTesterStatusResponse> {
  return fetchApi('/beta/status');
}

// Feedback Endpoints

export interface SubmitFeedbackParams {
  type: FeedbackType;
  category: FeedbackCategory;
  title?: string;
  content: string;
  rating?: number;
  npsScore?: number;
  featureName?: string;
  pageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SubmitFeedbackResponse {
  message: string;
  feedback: {
    id: string;
    type: FeedbackType;
    category: FeedbackCategory;
    status: FeedbackStatus;
    createdAt: string;
  };
}

export async function submitFeedback(params: SubmitFeedbackParams): Promise<SubmitFeedbackResponse> {
  return fetchApi('/beta/feedback', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface GetUserFeedbackResponse {
  feedback: BetaFeedback[];
}

export async function getUserFeedback(): Promise<GetUserFeedbackResponse> {
  return fetchApi('/beta/feedback');
}

// Analytics Event Tracking

export interface TrackEventParams {
  eventType: string;
  eventName: string;
  properties?: Record<string, unknown>;
  pageUrl?: string;
  referrer?: string;
  sessionId?: string;
}

export interface TrackEventResponse {
  success: boolean;
  eventId: string;
}

export async function trackEvent(params: TrackEventParams): Promise<TrackEventResponse> {
  return fetchApi('/beta/events', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface TrackBatchEventsResponse {
  success: boolean;
  eventsTracked: number;
  eventsSkipped: number;
}

export async function trackBatchEvents(events: TrackEventParams[]): Promise<TrackBatchEventsResponse> {
  return fetchApi('/beta/events/batch', {
    method: 'POST',
    body: JSON.stringify({ events }),
  });
}

// Feature Flags

export interface GetEnabledFeaturesResponse {
  features: BetaFeature[];
}

export async function getEnabledFeatures(): Promise<GetEnabledFeaturesResponse> {
  return fetchApi('/beta/features');
}

export interface CheckFeatureResponse {
  enabled: boolean;
  feature?: BetaFeature;
}

export async function checkFeature(featureName: string): Promise<CheckFeatureResponse> {
  return fetchApi(`/beta/features/${encodeURIComponent(featureName)}`);
}

// Beta Metrics (for dashboard)

export interface BetaMetricsResponse {
  applications: {
    total: number;
    byStatus: Array<{ status: BetaApplicationStatus; count: number }>;
  };
  testers: {
    total: number;
    byStatus: Array<{ status: BetaTesterStatus; count: number }>;
    byCohort: Array<{ cohort: string; count: number }>;
    activeLastWeek: number;
  };
  feedback: {
    total: number;
    byType: Array<{ type: FeedbackType; count: number }>;
    averageNps: number | null;
  };
}

export async function getBetaMetrics(): Promise<BetaMetricsResponse> {
  return fetchApi('/beta/admin/metrics');
}

// Analytics Summary (for dashboard)

export interface AnalyticsSummaryResponse {
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    dateRange: { start: string; end: string };
  };
  eventsByType: Array<{ type: string; count: number }>;
  eventsByDay: Array<{ date: string; count: number }>;
  topPages: Array<{ url: string; count: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
}

export async function getAnalyticsSummary(startDate?: string, endDate?: string): Promise<AnalyticsSummaryResponse> {
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.set('startDate', startDate);
  if (endDate) searchParams.set('endDate', endDate);

  const query = searchParams.toString();
  return fetchApi(`/beta/admin/analytics${query ? `?${query}` : ''}`);
}
