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
