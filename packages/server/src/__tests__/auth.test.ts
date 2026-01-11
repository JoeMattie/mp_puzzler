// packages/server/src/__tests__/auth.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Auth endpoints', () => {
  const app = createApp();

  beforeEach(async () => {
    await prisma.session.deleteMany();
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
  });

  describe('POST /api/auth/anonymous', () => {
    it('should create anonymous session with token and display name', async () => {
      const res = await request(app).post('/api/auth/anonymous');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('displayName');
      expect(res.body).toHaveProperty('sessionId');
      expect(res.body.displayName).toMatch(/^Anonymous \w+$/);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return session info with valid token', async () => {
      const createRes = await request(app).post('/api/auth/anonymous');
      const { token } = createRes.body;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('displayName');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
