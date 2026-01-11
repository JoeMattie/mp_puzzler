// packages/server/src/routes/auth.ts
import { Router } from 'express';
import { createAnonymousSession } from '../services/auth.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/anonymous', async (_req, res) => {
  try {
    const result = await createAnonymousSession();
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({
    sessionId: req.session!.id,
    displayName: req.session!.displayName,
    userId: req.session!.userId,
  });
});

export const authRouter: Router = router;
