import { PrismaClient } from '@prisma/client';
import { isProd } from './env';

export const prisma = new PrismaClient({
  log: isProd ? ['error', 'warn'] : ['query', 'error', 'warn'],
});

process.on('beforeExit', () => {
  void prisma.$disconnect();
});
