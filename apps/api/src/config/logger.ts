import pino from 'pino';
import { env, isProduction } from './env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : isProduction ? 'info' : 'debug',
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
  redact: {
    // Never log PII or secrets, even accidentally — see docs/SECURITY.md §9.
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.phone',
      '*.email',
      '*.token',
      '*.otp',
    ],
    censor: '[redacted]',
  },
});
