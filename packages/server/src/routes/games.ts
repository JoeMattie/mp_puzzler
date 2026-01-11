// packages/server/src/routes/games.ts
import { Router } from 'express';
import { createGameSchema } from '@mp-puzzler/shared';
import { createGame, getGameBySlug, getGameStencil, getGameState } from '../services/games.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const input = createGameSchema.parse(req.body);
    const game = await createGame(input, req.session!.id);
    res.status(201).json(game);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: error.message || 'Failed to create game' });
  }
});

router.get('/:slug', optionalAuth, async (req: AuthRequest, res) => {
  const game = await getGameBySlug(req.params.slug, req.session?.id);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  res.json(game);
});

router.get('/:slug/stencil', async (req, res) => {
  const stencil = await getGameStencil(req.params.slug);
  if (!stencil) {
    return res.status(404).json({ error: 'Game not found' });
  }
  res.json(stencil);
});

router.get('/:slug/state', async (req, res) => {
  const state = await getGameState(req.params.slug);
  if (!state) {
    return res.status(404).json({ error: 'Game not found' });
  }
  res.json(state);
});

export const gamesRouter: Router = router;
