import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  base: {
    env: process.env.NODE_ENV || 'development',
    service: process.env.SERVICE_NAME || 'studysync',
  },
  redact: {
    paths: ['password', 'token', 'authorization', 'cookie', '*.password', '*.token'],
    censor: '[REDACTED]',
  },
});

export const createChildLogger = (name: string, bindings?: Record<string, unknown>) => {
  return logger.child({ name, ...bindings });
};

export type Logger = typeof logger;
