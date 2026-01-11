// packages/server/src/__tests__/setup.ts
import { prisma } from '../lib/prisma.js';

// Check database availability at module load time (top-level await)
let dbAvailable = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbAvailable = true;
} catch {
  console.log('⚠️  Database not available, some tests will be skipped');
}

export { dbAvailable, prisma };
