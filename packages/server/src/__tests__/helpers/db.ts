// packages/server/src/__tests__/helpers/db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function checkDatabaseOrSkip(): Promise<void> {
  const available = await isDatabaseAvailable();
  if (!available) {
    console.log('⚠️  Database not available, skipping database tests');
  }
}

export { prisma };
