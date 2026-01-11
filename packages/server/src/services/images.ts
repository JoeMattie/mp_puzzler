// packages/server/src/services/images.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getCuratedImages() {
  return prisma.image.findMany({
    where: { isCurated: true },
    select: {
      id: true,
      url: true,
      width: true,
      height: true,
      name: true,
    },
  });
}

export async function getImageById(id: string) {
  return prisma.image.findUnique({
    where: { id },
    select: {
      id: true,
      url: true,
      width: true,
      height: true,
      name: true,
    },
  });
}
