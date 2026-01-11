// packages/server/src/__tests__/games.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { dbAvailable, prisma } from './setup.js';

describe.skipIf(!dbAvailable)('Games endpoints', () => {
  const app = createApp();
  let authToken: string;
  let testImageId: string;

  beforeEach(async () => {
    // Clean up first
    await prisma.pieceState.deleteMany();
    await prisma.edgeState.deleteMany();
    await prisma.game.deleteMany();
    await prisma.puzzle.deleteMany();
    await prisma.image.deleteMany();
    await prisma.session.deleteMany();

    // Create test image
    const image = await prisma.image.create({
      data: { url: `/test-${Date.now()}.jpg`, width: 800, height: 600, name: 'Test', isCurated: true },
    });
    testImageId = image.id;

    // Get auth token
    const authRes = await request(app).post('/api/auth/anonymous');
    authToken = authRes.body.token;
  });

  afterEach(async () => {
    await prisma.pieceState.deleteMany();
    await prisma.edgeState.deleteMany();
    await prisma.game.deleteMany();
    await prisma.puzzle.deleteMany();
    await prisma.image.deleteMany();
    await prisma.session.deleteMany();
  });

  describe('POST /api/games', () => {
    it('should create a new game', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          imageId: testImageId,
          pieceCount: 200,
          tileType: 'classic',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('urlSlug');
      expect(res.body.urlSlug).toHaveLength(8);
    });
  });

  describe('GET /api/games/:slug', () => {
    it('should return game metadata', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ imageId: testImageId, pieceCount: 200, tileType: 'classic' });

      const { urlSlug } = createRes.body;

      const res = await request(app)
        .get(`/api/games/${urlSlug}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pieceCount).toBeGreaterThan(150);
      expect(res.body.pieceCount).toBeLessThan(250);
      expect(res.body).toHaveProperty('tileType', 'classic');
    });
  });

  describe('GET /api/games/:slug/stencil', () => {
    it('should return stencil data', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ imageId: testImageId, pieceCount: 200, tileType: 'classic' });

      const { urlSlug } = createRes.body;

      const res = await request(app).get(`/api/games/${urlSlug}/stencil`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pieces');
      expect(res.body).toHaveProperty('edges');
      expect(Array.isArray(res.body.pieces)).toBe(true);
    });
  });
});
