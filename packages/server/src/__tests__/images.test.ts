// packages/server/src/__tests__/images.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { dbAvailable, prisma } from './setup.js';

describe.skipIf(!dbAvailable)('Images endpoints', () => {
  const app = createApp();

  beforeAll(async () => {
    // Clean up related data first (foreign key constraints)
    await prisma.pieceState.deleteMany();
    await prisma.edgeState.deleteMany();
    await prisma.game.deleteMany();
    await prisma.puzzle.deleteMany();
    await prisma.session.deleteMany();
    await prisma.image.deleteMany();
    await prisma.image.createMany({
      data: [
        { id: 'img-test-1', url: '/images/landscape-test.jpg', width: 1920, height: 1080, name: 'Landscape', isCurated: true },
        { id: 'img-test-2', url: '/images/abstract-test.jpg', width: 1600, height: 1600, name: 'Abstract', isCurated: true },
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
      const res = await request(app).get('/api/images/img-test-1');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Landscape');
    });

    it('should return 404 for unknown image', async () => {
      const res = await request(app).get('/api/images/unknown');
      expect(res.status).toBe(404);
    });
  });
});
