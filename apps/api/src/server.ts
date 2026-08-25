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
import { chatRouter } from './routes/chat.routes';
import { authRouter } from './routes/auth.routes';
import { adminRouter } from './routes/admin.routes';

const app = express();

// Behind Nginx on the Azure VM — needed for correct client IPs in rate limiting.
app.set('trust proxy', 1);

app.use(
  helmet({
    // The web app sets its own CSP; the API only serves JSON.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

const allowedOrigins = [env.SITE_URL, env.ADMIN_ORIGIN].filter(Boolean) as string[];

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
app.use('/api/chat', chatRouter);
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
