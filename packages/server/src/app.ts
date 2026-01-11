// packages/server/src/app.ts
import express, { Express } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { imagesRouter } from './routes/images.js';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/images', imagesRouter);

  return app;
}
