// packages/server/prisma/seed.ts
import { prisma } from '../src/lib/prisma.js';

const CURATED_IMAGES = [
  { name: 'Mountain Lake', url: '/images/mountain-lake.jpg', width: 1920, height: 1280 },
  { name: 'Autumn Forest', url: '/images/autumn-forest.jpg', width: 1920, height: 1280 },
  { name: 'Ocean Sunset', url: '/images/ocean-sunset.jpg', width: 1920, height: 1080 },
  { name: 'City Skyline', url: '/images/city-skyline.jpg', width: 1920, height: 1080 },
  { name: 'Flower Garden', url: '/images/flower-garden.jpg', width: 1600, height: 1200 },
  { name: 'Northern Lights', url: '/images/northern-lights.jpg', width: 1920, height: 1080 },
];

async function main() {
  console.log('Seeding curated images...');

  for (const image of CURATED_IMAGES) {
    await prisma.image.upsert({
      where: { url: image.url },
      update: image,
      create: { ...image, isCurated: true },
    });
  }

  console.log(`Seeded ${CURATED_IMAGES.length} images`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
