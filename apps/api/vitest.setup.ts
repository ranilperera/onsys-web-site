/**
 * Test environment. The real env.ts intentionally calls process.exit(1) on
 * missing config — correct for production boot, fatal for a test runner — so
 * we supply the minimum required values before any module imports it.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.SESSION_SECRET = 'test-secret-value-at-least-16-chars';
process.env.SITE_URL = 'http://localhost:3000';
process.env.API_URL = 'http://localhost:4000';
