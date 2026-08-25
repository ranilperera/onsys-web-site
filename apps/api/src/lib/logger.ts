import pino from 'pino';
import { isProd } from './env';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  transport: isProd ? undefined : { target: 'pino-pretty', options: { colorize: true } },
  // Never let a secret or a visitor's message body reach the logs.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.captchaToken',
      'req.body.message',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
});
