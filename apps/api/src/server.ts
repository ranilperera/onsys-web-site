import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { env, isProd, graphConfigured, teamsConfigured, aiConfigured } from './lib/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { globalLimiter } from './middleware/security';
import { errorHandler, notFound } from './middleware/error';
import { contentRouter } from './routes/content.routes';
import { leadRouter } from './routes/lead.routes';
import { bookingRouter } from './routes/booking.routes';
import { chatRouter } from './routes/chat.routes';
import { emergencyRouter } from './routes/emergency.routes';
import { healthCheckRouter } from './routes/healthcheck.routes';
import { authRouter } from './routes/auth.routes';
import { adminRouter } from './routes/admin.routes';

const app = express();

// Number of reverse proxies in front of this process. Express walks back that
// many hops through X-Forwarded-For to find the real client IP, and getting it
// wrong is silent: too low and every visitor shares the proxy's IP, so one
// person's traffic rate-limits everybody; too high and a client can spoof its
// own address by sending an X-Forwarded-For header.
//
//   1 = a single proxy          (nginx or HAProxy alone)
//   2 = HAProxy -> nginx edge   (the Docker topology in DOCKER-DEPLOYMENT.md)
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

app.use(
  helmet({
    // The web app sets its own CSP; the API only serves JSON.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

/**
 * Both spellings of a hostname: `example.com` and `www.example.com`.
 *
 * SITE_URL names the canonical host, but the other one of the pair almost
 * always resolves too — a bookmark, an inbound link, a page someone still has
 * open. A visitor who lands there gets markup that renders perfectly (it is
 * server-rendered) and then every form fails at the CORS preflight, which reads
 * as "the site is broken" rather than "you are on the wrong hostname".
 *
 * Redirecting to the canonical host is still the right thing to do, and belongs
 * in the proxy. This just stops the wrong host being silently unusable.
 */
function withHostSibling(url: string): string[] {
  try {
    const parsed = new URL(url);
    const sibling = new URL(url);
    sibling.hostname = parsed.hostname.startsWith('www.')
      ? parsed.hostname.slice(4)
      : `www.${parsed.hostname}`;
    return [parsed.origin, sibling.origin];
  } catch {
    return [url];
  }
}

const allowedOrigins = [
  ...withHostSibling(env.SITE_URL),
  ...(env.ADMIN_ORIGIN ? [env.ADMIN_ORIGIN] : []),
].filter(Boolean);

logger.info({ allowedOrigins }, 'CORS origins');

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin/server-side requests have no Origin header.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);

app.use(compression());

/**
 * Stripe's webhook signature is computed over the exact bytes Stripe sent, so
 * this route has to see the raw body. It is mounted ahead of express.json()
 * because once the JSON parser has turned the body into an object the original
 * bytes are gone and the signature can never verify — which fails as a silent
 * "invalid signature" rejection of every genuine payment notification.
 */
app.use('/api/emergency/webhook', express.raw({ type: 'application/json', limit: '1mb' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
app.use(globalLimiter);

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      integrations: { graph: graphConfigured, teams: teamsConfigured, ai: aiConfigured },
    });
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    res.status(503).json({ status: 'degraded', database: 'unreachable' });
  }
});

app.use('/api/content', contentRouter);
app.use('/api/leads', leadRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/chat', chatRouter);
app.use('/api/emergency', emergencyRouter);
app.use('/api/health-check', healthCheckRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      graph: graphConfigured ? 'configured' : 'disabled',
      teams: teamsConfigured ? 'configured' : 'disabled',
      ai: aiConfigured ? 'configured' : 'disabled',
    },
    'Onsys API listening',
  );

  if (isProd) {
    if (!graphConfigured) logger.warn('Microsoft Graph is NOT configured — enquiry emails will not send.');
    if (!teamsConfigured) logger.warn('Teams is NOT configured — chat escalation will not reach the team.');
    if (!aiConfigured) logger.warn('OpenAI is NOT configured — the chatbot will escalate every question.');
  }
});

/** Drain in-flight requests before exiting so deploys do not drop connections. */
function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
