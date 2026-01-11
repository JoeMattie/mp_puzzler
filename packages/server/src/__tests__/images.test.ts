// packages/server/src/__tests__/images.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma, isDatabaseAvailable } from './helpers/db.js';

let dbAvailable = false;

beforeAll(async () => {
  dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    console.log('⚠️  Database not available, skipping images tests');
  }
});

describe.skipIf(() => !dbAvailable)('Images endpoints', () => {
  const app = createApp();

  beforeAll(async () => {
    // Seed curated images
    await prisma.image.createMany({
      data: [
        { id: 'test-1', url: '/images/landscape.jpg', width: 1920, height: 1080, name: 'Landscape', isCurated: true },
        { id: 'test-2', url: '/images/abstract.jpg', width: 1600, height: 1600, name: 'Abstract', isCurated: true },
      ],
    });
  });

  afterAll(async () => {
    await prisma.image.deleteMany();
  });

  describe('GET /api/images', () => {
    it('should return curated images', async () => {
      const res = await request(app).get('/api/images');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('url');
      expect(res.body[0]).toHaveProperty('name');
    });
  });

  describe('GET /api/images/:id', () => {
    it('should return single image', async () => {
      const res = await request(app).get('/api/images/test-1');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Landscape');
    });

    it('should return 404 for unknown image', async () => {
      const res = await request(app).get('/api/images/unknown');
      expect(res.status).toBe(404);
    });
  });
});
