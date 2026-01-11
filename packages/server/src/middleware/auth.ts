// packages/server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { getSessionFromToken } from '../services/auth.js';

export interface AuthRequest extends Request {
  session?: {
    id: string;
    displayName: string;
    userId: string | null;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  const session = await getSessionFromToken(token);

  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.session = {
    id: session.id,
    displayName: session.displayName,
    userId: session.userId,
  };

  next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    getSessionFromToken(token).then((session) => {
      if (session) {
        req.session = {
          id: session.id,
          displayName: session.displayName,
          userId: session.userId,
        };
      }
      next();
    });
  } else {
    next();
  }
}
