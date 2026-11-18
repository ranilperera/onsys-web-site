import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { isProd } from '../lib/env';
import { logger } from '../lib/logger';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

/**
 * An error whose message is meant for whoever made the request.
 *
 * Everything else that reaches the handler below is reported as a 500 with a
 * generic sentence, which is right: an unexpected failure's message is for the
 * log, not for the caller. This class is the explicit opt out, so a route deep
 * in a helper can refuse a request without having to return a response object
 * back up through its callers.
 */
export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  res.status(500).json({
    error: 'Something went wrong on our end.',
    ...(isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
  });
};

/** Wraps async handlers so rejected promises reach the error handler. */
export const asyncHandler =
  <T extends RequestHandler>(fn: T): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
