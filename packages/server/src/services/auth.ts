// packages/server/src/services/auth.ts
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const ADJECTIVES = ['Happy', 'Clever', 'Swift', 'Brave', 'Calm', 'Eager', 'Gentle', 'Kind'];
const NOUNS = ['Panda', 'Fox', 'Owl', 'Bear', 'Wolf', 'Hawk', 'Deer', 'Otter'];

function generateDisplayName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `Anonymous ${adj}${noun}`;
}

export async function createAnonymousSession() {
  const displayName = generateDisplayName();
  const token = nanoid(32);

  const session = await prisma.session.create({
    data: {
      token,
      displayName,
    },
  });

  const jwtToken = jwt.sign({ sessionId: session.id }, JWT_SECRET, { expiresIn: '30d' });

  return {
    sessionId: session.id,
    token: jwtToken,
    displayName: session.displayName,
  };
}

export async function getSessionFromToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sessionId: string };
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
      include: { user: true },
    });
    return session;
  } catch {
    return null;
  }
}

export async function updateLastSeen(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastSeen: new Date() },
  });
}
