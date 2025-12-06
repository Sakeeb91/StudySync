export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
  },
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
  },
  AI: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
  },
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const FILE_UPLOAD = {
  MAX_SIZE_MB: 50,
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'video/mp4',
    'video/webm',
    'image/jpeg',
    'image/png',
  ],
} as const;

export const SUBSCRIPTION_LIMITS = {
  FREE: {
    courses: 1,
    flashcardsPerCourse: 50,
    quizzesPerDay: 3,
    uploadsPerMonth: 5,
  },
  PREMIUM: {
    courses: 10,
    flashcardsPerCourse: 500,
    quizzesPerDay: 50,
    uploadsPerMonth: 100,
  },
  STUDENT_PLUS: {
    courses: -1, // unlimited
    flashcardsPerCourse: -1,
    quizzesPerDay: -1,
    uploadsPerMonth: -1,
  },
  UNIVERSITY: {
    courses: -1,
    flashcardsPerCourse: -1,
    quizzesPerDay: -1,
    uploadsPerMonth: -1,
  },
} as const;
