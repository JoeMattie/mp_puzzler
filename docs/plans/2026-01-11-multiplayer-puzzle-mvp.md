# Multiplayer Jigsaw Puzzle MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a real-time multiplayer jigsaw puzzle game where users create puzzles from images and solve them collaboratively.

**Architecture:** Monolithic Node.js server with Express for REST API, Socket.IO for real-time sync, PostgreSQL for persistence. React frontend for lobby, PixiJS for puzzle canvas. Hybrid stencil generation (server computes geometry, client renders sprites).

**Tech Stack:** TypeScript, Node.js, Express, Socket.IO, PostgreSQL, Prisma ORM, React 18, PixiJS 8, Vite, Biome (linting/formatting)

---

## Phase 1: Project Scaffolding

### Task 1.1: Initialize Monorepo Structure

**Files:**
- Create: `package.json`
- Create: `packages/server/package.json`
- Create: `packages/client/package.json`
- Create: `packages/shared/package.json`
- Create: `turbo.json`
- Create: `biome.json`

**Step 1: Create root package.json**

```json
{
  "name": "mp-puzzler",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

**Step 2: Create server package.json**

```json
{
  "name": "@mp-puzzler/server",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest",
    "lint": "biome check src/",
    "format": "biome format src/ --write"
  },
  "dependencies": {
    "@mp-puzzler/shared": "workspace:*",
    "express": "^4.18.0",
    "socket.io": "^4.7.0",
    "@prisma/client": "^5.0.0",
    "zod": "^3.22.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "nanoid": "^5.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcryptjs": "^2.4.0",
    "@types/cors": "^2.8.0",
    "tsx": "^4.0.0",
    "vitest": "^1.0.0",
    "prisma": "^5.0.0"
  }
}
```

**Step 3: Create client package.json**

```json
{
  "name": "@mp-puzzler/client",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "biome check src/",
    "format": "biome format src/ --write"
  },
  "dependencies": {
    "@mp-puzzler/shared": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "pixi.js": "^8.0.0",
    "socket.io-client": "^4.7.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**Step 4: Create shared package.json**

```json
{
  "name": "@mp-puzzler/shared",
  "version": "0.0.1",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
```

**Step 5: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

**Step 6: Create biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "off"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  }
}
```

**Step 7: Commit**

```bash
git add package.json packages/ turbo.json biome.json
git commit -m "chore: initialize monorepo structure with turborepo and biome"
```

---

### Task 1.2: Configure TypeScript

**Files:**
- Create: `tsconfig.base.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/client/tsconfig.json`
- Create: `packages/shared/tsconfig.json`

**Step 1: Create base tsconfig**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Step 2: Create server tsconfig**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create client tsconfig**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "outDir": "dist",
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create shared tsconfig**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 5: Commit**

```bash
git add tsconfig.base.json packages/*/tsconfig.json
git commit -m "chore: configure typescript for all packages"
```

---

### Task 1.3: Create Shared Types

**Files:**
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/schemas.ts`

**Step 1: Create types.ts**

```typescript
// packages/shared/src/types.ts

export type TileType = 'classic' | `pentagon_${number}`;

export interface Piece {
  index: number;
  path: string;
  bounds: { x: number; y: number; w: number; h: number };
  centroid: { x: number; y: number };
  correctPosition: { x: number; y: number };
  correctRotation: number;
  edges: { neighborIndex: number; edgeId: string }[];
}

export interface Edge {
  id: string;
  pieces: [number, number];
  type: 'tab-blank' | 'flat';
}

export interface Stencil {
  pieces: Piece[];
  edges: Edge[];
  imageWidth: number;
  imageHeight: number;
}

export interface PieceState {
  index: number;
  x: number;
  y: number;
  rotation: number;
  inPanel: boolean;
  panelOrder: number | null;
  lockGroup: number | null;
}

export interface GameState {
  pieces: PieceState[];
  solvedEdges: string[];
  progress: number;
  playerCount: number;
}

export interface Player {
  id: string;
  displayName: string;
  isAdmin: boolean;
}

// Socket events
export interface ServerToClientEvents {
  'piece:grab:denied': (data: { pieceIndex: number; heldBy: string }) => void;
  'piece:grabbed': (data: { pieceIndex: number; lockGroup: number[]; byPlayer: string }) => void;
  'piece:moved': (data: { pieceIndex: number; x: number; y: number; byPlayer: string }) => void;
  'piece:rotated': (data: { pieceIndex: number; rotation: number; byPlayer: string }) => void;
  'piece:dropped': (data: { pieceIndex: number; x: number; y: number; rotation: number; snapped: boolean; newLockGroup: number[] | null }) => void;
  'piece:snapped': (data: { edges: string[]; lockGroup: number[] }) => void;
  'cursor:moved': (data: { playerId: string; displayName: string; x: number; y: number }) => void;
  'reaction:received': (data: { playerId: string; emoji: string; x: number; y: number }) => void;
  'player:joined': (data: Player) => void;
  'player:left': (data: { playerId: string }) => void;
  'game:completed': (data: { completedAt: string }) => void;
  'game:state': (data: GameState) => void;
}

export interface ClientToServerEvents {
  'piece:grab': (data: { pieceIndex: number }) => void;
  'piece:move': (data: { pieceIndex: number; x: number; y: number }) => void;
  'piece:rotate': (data: { pieceIndex: number; rotation: number }) => void;
  'piece:drop': (data: { pieceIndex: number; x: number; y: number; rotation: number }, callback: (response: { error?: string; x?: number; y?: number; rotation?: number; snapped?: boolean; edges?: string[] }) => void) => void;
  'piece:panel': (data: { pieceIndex: number; panelOrder: number }) => void;
  'cursor:move': (data: { x: number; y: number }) => void;
  'reaction:send': (data: { emoji: string; x: number; y: number }) => void;
}
```

**Step 2: Create schemas.ts**

```typescript
// packages/shared/src/schemas.ts
import { z } from 'zod';

export const createGameSchema = z.object({
  imageId: z.string().uuid(),
  pieceCount: z.number().int().min(200).max(900),
  tileType: z.union([
    z.literal('classic'),
    z.string().regex(/^pentagon_(0[1-9]|1[0-5])$/)
  ])
});

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

**Step 3: Create index.ts**

```typescript
// packages/shared/src/index.ts
export * from './types.js';
export * from './schemas.js';
```

**Step 4: Build shared package**

Run: `cd packages/shared && npx tsc`
Expected: Creates dist/ with compiled JS and type declarations

**Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types and validation schemas"
```

---

## Phase 2: Database Setup

### Task 2.1: Initialize Prisma Schema

**Files:**
- Create: `packages/server/prisma/schema.prisma`

**Step 1: Create schema.prisma**

```prisma
// packages/server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  username      String?   @unique
  email         String?   @unique
  passwordHash  String?
  oauthProvider String?
  oauthId       String?
  createdAt     DateTime  @default(now())
  sessions      Session[]
}

model Session {
  id          String   @id @default(uuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  token       String   @unique
  displayName String
  createdAt   DateTime @default(now())
  lastSeen    DateTime @default(now())

  createdPuzzles Puzzle[]
  adminGames     Game[]   @relation("GameAdmin")
}

model Image {
  id        String   @id @default(uuid())
  url       String
  width     Int
  height    Int
  name      String
  isCurated Boolean  @default(false)
  uploadedBy String?
  createdAt DateTime @default(now())
  puzzles   Puzzle[]
}

model Puzzle {
  id          String   @id @default(uuid())
  imageId     String
  image       Image    @relation(fields: [imageId], references: [id])
  pieceCount  Int
  tileType    String
  stencilData Json
  createdById String?
  createdBy   Session? @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  games       Game[]
}

model Game {
  id             String       @id @default(uuid())
  urlSlug        String       @unique
  puzzleId       String
  puzzle         Puzzle       @relation(fields: [puzzleId], references: [id])
  adminSessionId String?
  adminSession   Session?     @relation("GameAdmin", fields: [adminSessionId], references: [id])
  status         String       @default("active")
  createdAt      DateTime     @default(now())
  completedAt    DateTime?
  pieceStates    PieceState[]
  edgeStates     EdgeState[]
}

model PieceState {
  id         String  @id @default(uuid())
  gameId     String
  game       Game    @relation(fields: [gameId], references: [id], onDelete: Cascade)
  pieceIndex Int
  x          Float
  y          Float
  rotation   Float
  inPanel    Boolean @default(true)
  panelOrder Int?
  lockGroup  Int?

  @@unique([gameId, pieceIndex])
}

model EdgeState {
  id     String  @id @default(uuid())
  gameId String
  game   Game    @relation(fields: [gameId], references: [id], onDelete: Cascade)
  pieceA Int
  pieceB Int
  solved Boolean @default(false)

  @@unique([gameId, pieceA, pieceB])
}
```

**Step 2: Create .env file for development**

```bash
# packages/server/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mp_puzzler?schema=public"
JWT_SECRET="dev-secret-change-in-production"
```

**Step 3: Commit (excluding .env)**

```bash
echo "packages/server/.env" >> .gitignore
git add packages/server/prisma/schema.prisma .gitignore
git commit -m "feat: add prisma schema for database models"
```

---

### Task 2.2: Generate Prisma Client and Create Migration

**Step 1: Generate Prisma client**

Run: `cd packages/server && npx prisma generate`
Expected: Generates @prisma/client with typed models

**Step 2: Create migration**

Run: `cd packages/server && npx prisma migrate dev --name init`
Expected: Creates migration file in prisma/migrations/

**Step 3: Commit migration**

```bash
git add packages/server/prisma/migrations/
git commit -m "feat: add initial database migration"
```

---

## Phase 3: Server Foundation

### Task 3.1: Create Express Server with Health Check

**Files:**
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/app.ts`
- Test: `packages/server/src/__tests__/health.test.ts`

**Step 1: Write failing test**

```typescript
// packages/server/src/__tests__/health.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Health endpoint', () => {
  const app = createApp();

  it('should return 200 OK with status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && npx vitest run src/__tests__/health.test.ts`
Expected: FAIL - cannot find module '../app.js'

**Step 3: Create app.ts**

```typescript
// packages/server/src/app.ts
import express from 'express';
import cors from 'cors';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/server && npx vitest run src/__tests__/health.test.ts`
Expected: PASS

**Step 5: Create index.ts entry point**

```typescript
// packages/server/src/index.ts
import { createServer } from 'http';
import { createApp } from './app.js';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

async function main() {
  const app = createApp();
  const server = createServer(app);

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 6: Commit**

```bash
git add packages/server/src/
git commit -m "feat: create express server with health endpoint"
```

---

### Task 3.2: Add Anonymous Session Auth

**Files:**
- Create: `packages/server/src/services/auth.ts`
- Create: `packages/server/src/routes/auth.ts`
- Create: `packages/server/src/middleware/auth.ts`
- Test: `packages/server/src/__tests__/auth.test.ts`

**Step 1: Write failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && npx vitest run src/__tests__/auth.test.ts`
Expected: FAIL - 404 Not Found

**Step 3: Create auth service**

```typescript
// packages/server/src/services/auth.ts
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();
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
```

**Step 4: Create auth middleware**

```typescript
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
```

**Step 5: Create auth routes**

```typescript
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

export const authRouter = router;
```

**Step 6: Wire up routes in app.ts**

```typescript
// packages/server/src/app.ts
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);

  return app;
}
```

**Step 7: Run tests to verify they pass**

Run: `cd packages/server && npx vitest run src/__tests__/auth.test.ts`
Expected: PASS (all 3 tests)

**Step 8: Commit**

```bash
git add packages/server/src/
git commit -m "feat: add anonymous session authentication"
```

---

### Task 3.3: Add Image Gallery API

**Files:**
- Create: `packages/server/src/routes/images.ts`
- Create: `packages/server/src/services/images.ts`
- Test: `packages/server/src/__tests__/images.test.ts`

**Step 1: Write failing test**

```typescript
// packages/server/src/__tests__/images.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Images endpoints', () => {
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
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && npx vitest run src/__tests__/images.test.ts`
Expected: FAIL - 404 Not Found

**Step 3: Create images service**

```typescript
// packages/server/src/services/images.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getCuratedImages() {
  return prisma.image.findMany({
    where: { isCurated: true },
    select: {
      id: true,
      url: true,
      width: true,
      height: true,
      name: true,
    },
  });
}

export async function getImageById(id: string) {
  return prisma.image.findUnique({
    where: { id },
    select: {
      id: true,
      url: true,
      width: true,
      height: true,
      name: true,
    },
  });
}
```

**Step 4: Create images routes**

```typescript
// packages/server/src/routes/images.ts
import { Router } from 'express';
import { getCuratedImages, getImageById } from '../services/images.js';

const router = Router();

router.get('/', async (_req, res) => {
  const images = await getCuratedImages();
  res.json(images);
});

router.get('/:id', async (req, res) => {
  const image = await getImageById(req.params.id);
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }
  res.json(image);
});

export const imagesRouter = router;
```

**Step 5: Wire up in app.ts**

```typescript
// packages/server/src/app.ts - add import and route
import { imagesRouter } from './routes/images.js';

// In createApp():
app.use('/api/images', imagesRouter);
```

**Step 6: Run tests to verify they pass**

Run: `cd packages/server && npx vitest run src/__tests__/images.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/server/src/
git commit -m "feat: add images gallery API"
```

---

### Task 3.4: Add Stencil Generator (Classic Tiles)

**Files:**
- Create: `packages/server/src/services/stencil/index.ts`
- Create: `packages/server/src/services/stencil/classic.ts`
- Create: `packages/server/src/services/stencil/bezier.ts`
- Test: `packages/server/src/__tests__/stencil.test.ts`

**Step 1: Write failing test**

```typescript
// packages/server/src/__tests__/stencil.test.ts
import { describe, it, expect } from 'vitest';
import { generateClassicStencil } from '../services/stencil/index.js';

describe('Stencil generator', () => {
  describe('generateClassicStencil', () => {
    it('should generate correct number of pieces', () => {
      const stencil = generateClassicStencil({
        imageWidth: 800,
        imageHeight: 600,
        pieceCount: 200,
      });

      // Piece count is approximate due to aspect ratio fitting
      expect(stencil.pieces.length).toBeGreaterThanOrEqual(180);
      expect(stencil.pieces.length).toBeLessThanOrEqual(220);
    });

    it('should generate pieces with valid paths', () => {
      const stencil = generateClassicStencil({
        imageWidth: 800,
        imageHeight: 600,
        pieceCount: 200,
      });

      for (const piece of stencil.pieces) {
        expect(piece.path).toMatch(/^M /);
        expect(piece.bounds).toHaveProperty('x');
        expect(piece.bounds).toHaveProperty('y');
        expect(piece.bounds).toHaveProperty('w');
        expect(piece.bounds).toHaveProperty('h');
      }
    });

    it('should generate edges between adjacent pieces', () => {
      const stencil = generateClassicStencil({
        imageWidth: 800,
        imageHeight: 600,
        pieceCount: 200,
      });

      expect(stencil.edges.length).toBeGreaterThan(0);

      for (const edge of stencil.edges) {
        expect(edge.pieces).toHaveLength(2);
        expect(edge.id).toMatch(/^\d+-\d+$/);
      }
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && npx vitest run src/__tests__/stencil.test.ts`
Expected: FAIL - cannot find module

**Step 3: Create bezier utilities**

```typescript
// packages/server/src/services/stencil/bezier.ts

export interface Point {
  x: number;
  y: number;
}

export function generateTabPath(
  start: Point,
  end: Point,
  isTab: boolean,
  seed: number
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Normalize direction
  const nx = dx / length;
  const ny = dy / length;

  // Perpendicular direction
  const px = -ny;
  const py = nx;

  // Tab parameters with slight randomization
  const tabHeight = length * 0.25 * (0.9 + seededRandom(seed) * 0.2);
  const tabWidth = length * 0.35 * (0.9 + seededRandom(seed + 1) * 0.2);
  const neckWidth = length * 0.15 * (0.9 + seededRandom(seed + 2) * 0.2);

  const direction = isTab ? 1 : -1;

  // Key points along the edge
  const p1 = { x: start.x + dx * 0.35, y: start.y + dy * 0.35 };
  const p2 = { x: start.x + dx * 0.4, y: start.y + dy * 0.4 };
  const p3 = {
    x: start.x + dx * 0.5 + px * tabHeight * direction,
    y: start.y + dy * 0.5 + py * tabHeight * direction,
  };
  const p4 = { x: start.x + dx * 0.6, y: start.y + dy * 0.6 };
  const p5 = { x: start.x + dx * 0.65, y: start.y + dy * 0.65 };

  // Control points for bezier curves
  return [
    `L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `C ${p1.x + px * neckWidth * direction} ${p1.y + py * neckWidth * direction}`,
    `${p2.x + px * tabHeight * direction - nx * tabWidth} ${p2.y + py * tabHeight * direction - ny * tabWidth}`,
    `${p3.x - nx * tabWidth * 0.3} ${p3.y - ny * tabWidth * 0.3}`,
    `C ${p3.x + nx * tabWidth * 0.3} ${p3.y + ny * tabWidth * 0.3}`,
    `${p4.x + px * tabHeight * direction + nx * tabWidth} ${p4.y + py * tabHeight * direction + ny * tabWidth}`,
    `${p5.x + px * neckWidth * direction} ${p5.y + py * neckWidth * direction}`,
    `L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
  ].join(' ');
}

export function generateFlatPath(start: Point, end: Point): string {
  return `L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}
```

**Step 4: Create classic stencil generator**

```typescript
// packages/server/src/services/stencil/classic.ts
import { Stencil, Piece, Edge } from '@mp-puzzler/shared';
import { generateTabPath, generateFlatPath, Point } from './bezier.js';

interface GenerateOptions {
  imageWidth: number;
  imageHeight: number;
  pieceCount: number;
}

export function generateClassicStencil(options: GenerateOptions): Stencil {
  const { imageWidth, imageHeight, pieceCount } = options;

  // Calculate grid dimensions based on aspect ratio
  const aspectRatio = imageWidth / imageHeight;
  const rows = Math.round(Math.sqrt(pieceCount / aspectRatio));
  const cols = Math.round(rows * aspectRatio);

  const pieceWidth = imageWidth / cols;
  const pieceHeight = imageHeight / rows;

  const pieces: Piece[] = [];
  const edges: Edge[] = [];
  const tabDirections: Map<string, boolean> = new Map();

  // Generate pieces
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const x = col * pieceWidth;
      const y = row * pieceHeight;

      // Determine tab directions for each edge
      const topEdge = row === 0 ? 'flat' : getEdgeKey(index, index - cols);
      const rightEdge = col === cols - 1 ? 'flat' : getEdgeKey(index, index + 1);
      const bottomEdge = row === rows - 1 ? 'flat' : getEdgeKey(index, index + cols);
      const leftEdge = col === 0 ? 'flat' : getEdgeKey(index, index - 1);

      // Generate random tab directions for new edges
      if (rightEdge !== 'flat' && !tabDirections.has(rightEdge)) {
        tabDirections.set(rightEdge, Math.random() > 0.5);
      }
      if (bottomEdge !== 'flat' && !tabDirections.has(bottomEdge)) {
        tabDirections.set(bottomEdge, Math.random() > 0.5);
      }

      // Build piece path
      const corners: Point[] = [
        { x, y },
        { x: x + pieceWidth, y },
        { x: x + pieceWidth, y: y + pieceHeight },
        { x, y: y + pieceHeight },
      ];

      const path = buildPiecePath(
        corners,
        { top: topEdge, right: rightEdge, bottom: bottomEdge, left: leftEdge },
        tabDirections,
        index
      );

      // Track edges
      const pieceEdges: { neighborIndex: number; edgeId: string }[] = [];

      if (row > 0) {
        const edgeId = `${index - cols}-${index}`;
        pieceEdges.push({ neighborIndex: index - cols, edgeId });
        if (!edges.find(e => e.id === edgeId)) {
          edges.push({ id: edgeId, pieces: [index - cols, index], type: 'tab-blank' });
        }
      }
      if (col < cols - 1) {
        const edgeId = `${index}-${index + 1}`;
        pieceEdges.push({ neighborIndex: index + 1, edgeId });
        edges.push({ id: edgeId, pieces: [index, index + 1], type: 'tab-blank' });
      }
      if (row < rows - 1) {
        const edgeId = `${index}-${index + cols}`;
        pieceEdges.push({ neighborIndex: index + cols, edgeId });
        edges.push({ id: edgeId, pieces: [index, index + cols], type: 'tab-blank' });
      }
      if (col > 0) {
        const edgeId = `${index - 1}-${index}`;
        pieceEdges.push({ neighborIndex: index - 1, edgeId });
      }

      pieces.push({
        index,
        path,
        bounds: {
          x: x - pieceWidth * 0.15,
          y: y - pieceHeight * 0.15,
          w: pieceWidth * 1.3,
          h: pieceHeight * 1.3,
        },
        centroid: { x: x + pieceWidth / 2, y: y + pieceHeight / 2 },
        correctPosition: { x, y },
        correctRotation: 0,
        edges: pieceEdges,
      });
    }
  }

  return {
    pieces,
    edges,
    imageWidth,
    imageHeight,
  };
}

function getEdgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function buildPiecePath(
  corners: Point[],
  edgeTypes: { top: string; right: string; bottom: string; left: string },
  tabDirections: Map<string, boolean>,
  seed: number
): string {
  const parts: string[] = [`M ${corners[0].x.toFixed(2)} ${corners[0].y.toFixed(2)}`];

  // Top edge
  if (edgeTypes.top === 'flat') {
    parts.push(generateFlatPath(corners[0], corners[1]));
  } else {
    const isTab = tabDirections.get(edgeTypes.top) ?? false;
    parts.push(generateTabPath(corners[0], corners[1], !isTab, seed * 4));
  }

  // Right edge
  if (edgeTypes.right === 'flat') {
    parts.push(generateFlatPath(corners[1], corners[2]));
  } else {
    const isTab = tabDirections.get(edgeTypes.right) ?? false;
    parts.push(generateTabPath(corners[1], corners[2], isTab, seed * 4 + 1));
  }

  // Bottom edge
  if (edgeTypes.bottom === 'flat') {
    parts.push(generateFlatPath(corners[2], corners[3]));
  } else {
    const isTab = tabDirections.get(edgeTypes.bottom) ?? false;
    parts.push(generateTabPath(corners[2], corners[3], isTab, seed * 4 + 2));
  }

  // Left edge
  if (edgeTypes.left === 'flat') {
    parts.push(generateFlatPath(corners[3], corners[0]));
  } else {
    const isTab = tabDirections.get(edgeTypes.left) ?? false;
    parts.push(generateTabPath(corners[3], corners[0], !isTab, seed * 4 + 3));
  }

  parts.push('Z');
  return parts.join(' ');
}
```

**Step 5: Create stencil index**

```typescript
// packages/server/src/services/stencil/index.ts
export { generateClassicStencil } from './classic.js';
```

**Step 6: Run tests to verify they pass**

Run: `cd packages/server && npx vitest run src/__tests__/stencil.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/server/src/services/stencil/
git commit -m "feat: add classic jigsaw stencil generator"
```

---

### Task 3.5: Add Games API

**Files:**
- Create: `packages/server/src/routes/games.ts`
- Create: `packages/server/src/services/games.ts`
- Test: `packages/server/src/__tests__/games.test.ts`

**Step 1: Write failing test**

```typescript
// packages/server/src/__tests__/games.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Games endpoints', () => {
  const app = createApp();
  let authToken: string;
  let testImageId: string;

  beforeEach(async () => {
    // Create test image
    const image = await prisma.image.create({
      data: { url: '/test.jpg', width: 800, height: 600, name: 'Test', isCurated: true },
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
      expect(res.body).toHaveProperty('pieceCount', 200);
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
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && npx vitest run src/__tests__/games.test.ts`
Expected: FAIL - 404 Not Found

**Step 3: Create games service**

```typescript
// packages/server/src/services/games.ts
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import { generateClassicStencil } from './stencil/index.js';
import type { CreateGameInput, Stencil, PieceState } from '@mp-puzzler/shared';

const prisma = new PrismaClient();

export async function createGame(input: CreateGameInput, sessionId: string) {
  const image = await prisma.image.findUnique({ where: { id: input.imageId } });
  if (!image) throw new Error('Image not found');

  // Generate stencil
  let stencilData: Stencil;
  if (input.tileType === 'classic') {
    stencilData = generateClassicStencil({
      imageWidth: image.width,
      imageHeight: image.height,
      pieceCount: input.pieceCount,
    });
  } else {
    // Pentagon types - placeholder for now
    throw new Error('Pentagon tiles not yet implemented');
  }

  // Create puzzle
  const puzzle = await prisma.puzzle.create({
    data: {
      imageId: input.imageId,
      pieceCount: stencilData.pieces.length,
      tileType: input.tileType,
      stencilData: stencilData as any,
      createdById: sessionId,
    },
  });

  // Create game with unique slug
  const urlSlug = nanoid(8);
  const game = await prisma.game.create({
    data: {
      urlSlug,
      puzzleId: puzzle.id,
    },
  });

  // Initialize piece states (randomized in panel)
  const shuffledIndices = shuffle([...Array(stencilData.pieces.length).keys()]);
  await prisma.pieceState.createMany({
    data: shuffledIndices.map((pieceIndex, panelOrder) => ({
      gameId: game.id,
      pieceIndex,
      x: 0,
      y: 0,
      rotation: Math.random() * Math.PI * 2,
      inPanel: true,
      panelOrder,
    })),
  });

  // Initialize edge states
  await prisma.edgeState.createMany({
    data: stencilData.edges.map((edge) => ({
      gameId: game.id,
      pieceA: edge.pieces[0],
      pieceB: edge.pieces[1],
      solved: false,
    })),
  });

  return {
    id: game.id,
    urlSlug: game.urlSlug,
    pieceCount: puzzle.pieceCount,
    tileType: puzzle.tileType,
    imageUrl: image.url,
  };
}

export async function getGameBySlug(slug: string, sessionId?: string) {
  const game = await prisma.game.findUnique({
    where: { urlSlug: slug },
    include: {
      puzzle: {
        include: { image: true },
      },
    },
  });

  if (!game) return null;

  // Check if this session is admin
  const isAdmin = game.adminSessionId === sessionId;

  // If no admin yet and we have a session, claim admin
  if (!game.adminSessionId && sessionId) {
    await prisma.game.update({
      where: { id: game.id },
      data: { adminSessionId: sessionId },
    });
  }

  return {
    id: game.id,
    urlSlug: game.urlSlug,
    pieceCount: game.puzzle.pieceCount,
    tileType: game.puzzle.tileType,
    imageUrl: game.puzzle.image.url,
    imageWidth: game.puzzle.image.width,
    imageHeight: game.puzzle.image.height,
    status: game.status,
    isAdmin: isAdmin || !game.adminSessionId,
  };
}

export async function getGameStencil(slug: string) {
  const game = await prisma.game.findUnique({
    where: { urlSlug: slug },
    include: { puzzle: true },
  });

  if (!game) return null;
  return game.puzzle.stencilData as Stencil;
}

export async function getGameState(slug: string) {
  const game = await prisma.game.findUnique({
    where: { urlSlug: slug },
    include: {
      pieceStates: true,
      edgeStates: { where: { solved: true } },
    },
  });

  if (!game) return null;

  const solvedEdges = game.edgeStates.map((e) => `${e.pieceA}-${e.pieceB}`);
  const totalEdges = game.edgeStates.length + (await prisma.edgeState.count({ where: { gameId: game.id, solved: false } }));

  return {
    pieces: game.pieceStates.map((p) => ({
      index: p.pieceIndex,
      x: p.x,
      y: p.y,
      rotation: p.rotation,
      inPanel: p.inPanel,
      panelOrder: p.panelOrder,
      lockGroup: p.lockGroup,
    })),
    solvedEdges,
    progress: solvedEdges.length / totalEdges,
    playerCount: 0, // Will be updated via Socket.IO
  };
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

**Step 4: Create games routes**

```typescript
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

export const gamesRouter = router;
```

**Step 5: Wire up in app.ts**

```typescript
// packages/server/src/app.ts - add import and route
import { gamesRouter } from './routes/games.js';

// In createApp():
app.use('/api/games', gamesRouter);
```

**Step 6: Run tests to verify they pass**

Run: `cd packages/server && npx vitest run src/__tests__/games.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/server/src/
git commit -m "feat: add games API with stencil generation"
```

---

## Phase 4: Socket.IO Real-time

### Task 4.1: Add Socket.IO Server

**Files:**
- Create: `packages/server/src/socket/index.ts`
- Create: `packages/server/src/socket/handlers.ts`
- Modify: `packages/server/src/index.ts`

**Step 1: Create socket handlers**

```typescript
// packages/server/src/socket/handlers.ts
import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import type { ServerToClientEvents, ClientToServerEvents, PieceState } from '@mp-puzzler/shared';
import { getSessionFromToken } from '../services/auth.js';

const prisma = new PrismaClient();

// Track piece ownership: gameId -> pieceIndex -> sessionId
const pieceOwners = new Map<string, Map<number, string>>();

// Track connected players: gameId -> Set<sessionId>
const gamePlayers = new Map<string, Set<string>>();

// Track player socket mapping: sessionId -> socket
const playerSockets = new Map<string, Socket>();

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    const gameSlug = socket.handshake.auth.gameSlug;

    if (!token || !gameSlug) {
      return next(new Error('Missing auth token or game slug'));
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return next(new Error('Invalid token'));
    }

    // Find game
    const game = await prisma.game.findUnique({ where: { urlSlug: gameSlug } });
    if (!game) {
      return next(new Error('Game not found'));
    }

    socket.data.sessionId = session.id;
    socket.data.displayName = session.displayName;
    socket.data.gameId = game.id;
    socket.data.gameSlug = gameSlug;

    next();
  });

  io.on('connection', (socket) => {
    const { sessionId, displayName, gameId, gameSlug } = socket.data;

    // Join game room
    socket.join(`game:${gameSlug}`);

    // Track player
    if (!gamePlayers.has(gameId)) {
      gamePlayers.set(gameId, new Set());
    }
    gamePlayers.get(gameId)!.add(sessionId);
    playerSockets.set(sessionId, socket);

    // Initialize piece owners map for game
    if (!pieceOwners.has(gameId)) {
      pieceOwners.set(gameId, new Map());
    }

    // Broadcast player joined
    socket.to(`game:${gameSlug}`).emit('player:joined', {
      id: sessionId,
      displayName,
      isAdmin: false, // Will be set properly via REST API
    });

    // Handle piece grab
    socket.on('piece:grab', async ({ pieceIndex }) => {
      const owners = pieceOwners.get(gameId)!;
      const currentOwner = owners.get(pieceIndex);

      // Get lock group for this piece
      const pieceState = await prisma.pieceState.findFirst({
        where: { gameId, pieceIndex },
      });
      const lockGroup = pieceState?.lockGroup;

      // Get all pieces in lock group
      let lockGroupPieces: number[] = [pieceIndex];
      if (lockGroup !== null && lockGroup !== undefined) {
        const groupPieces = await prisma.pieceState.findMany({
          where: { gameId, lockGroup },
        });
        lockGroupPieces = groupPieces.map((p) => p.pieceIndex);
      }

      // Check if any piece in group is owned
      const groupOwner = lockGroupPieces.find((idx) => owners.has(idx));
      if (groupOwner !== undefined && owners.get(groupOwner) !== sessionId) {
        socket.emit('piece:grab:denied', {
          pieceIndex,
          heldBy: owners.get(groupOwner)!,
        });
        return;
      }

      // Claim all pieces in group
      lockGroupPieces.forEach((idx) => owners.set(idx, sessionId));

      socket.to(`game:${gameSlug}`).emit('piece:grabbed', {
        pieceIndex,
        lockGroup: lockGroupPieces,
        byPlayer: sessionId,
      });
    });

    // Handle piece move
    socket.on('piece:move', ({ pieceIndex, x, y }) => {
      socket.to(`game:${gameSlug}`).emit('piece:moved', {
        pieceIndex,
        x,
        y,
        byPlayer: sessionId,
      });
    });

    // Handle piece rotate
    socket.on('piece:rotate', ({ pieceIndex, rotation }) => {
      socket.to(`game:${gameSlug}`).emit('piece:rotated', {
        pieceIndex,
        rotation,
        byPlayer: sessionId,
      });
    });

    // Handle piece drop
    socket.on('piece:drop', async ({ pieceIndex, x, y, rotation }, callback) => {
      const owners = pieceOwners.get(gameId)!;

      // Verify ownership
      if (owners.get(pieceIndex) !== sessionId) {
        callback({ error: 'not_owner' });
        return;
      }

      // Get piece and its lock group
      const pieceState = await prisma.pieceState.findFirst({
        where: { gameId, pieceIndex },
      });

      // Get all pieces in lock group
      let lockGroupPieces: number[] = [pieceIndex];
      if (pieceState?.lockGroup !== null && pieceState?.lockGroup !== undefined) {
        const groupPieces = await prisma.pieceState.findMany({
          where: { gameId, lockGroup: pieceState.lockGroup },
        });
        lockGroupPieces = groupPieces.map((p) => p.pieceIndex);
      }

      // Release ownership
      lockGroupPieces.forEach((idx) => owners.delete(idx));

      // TODO: Check for snap conditions
      // For now, just save position
      await prisma.pieceState.update({
        where: { gameId_pieceIndex: { gameId, pieceIndex } },
        data: { x, y, rotation, inPanel: false, panelOrder: null },
      });

      callback({ x, y, rotation, snapped: false });

      socket.to(`game:${gameSlug}`).emit('piece:dropped', {
        pieceIndex,
        x,
        y,
        rotation,
        snapped: false,
        newLockGroup: null,
      });
    });

    // Handle cursor move
    socket.on('cursor:move', ({ x, y }) => {
      socket.to(`game:${gameSlug}`).emit('cursor:moved', {
        playerId: sessionId,
        displayName,
        x,
        y,
      });
    });

    // Handle reaction
    socket.on('reaction:send', ({ emoji, x, y }) => {
      socket.to(`game:${gameSlug}`).emit('reaction:received', {
        playerId: sessionId,
        emoji,
        x,
        y,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Release all pieces owned by this player
      const owners = pieceOwners.get(gameId);
      if (owners) {
        for (const [idx, owner] of owners) {
          if (owner === sessionId) {
            owners.delete(idx);
          }
        }
      }

      // Remove from tracking
      gamePlayers.get(gameId)?.delete(sessionId);
      playerSockets.delete(sessionId);

      socket.to(`game:${gameSlug}`).emit('player:left', { playerId: sessionId });
    });
  });
}
```

**Step 2: Create socket index**

```typescript
// packages/server/src/socket/index.ts
import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@mp-puzzler/shared';
import { registerSocketHandlers } from './handlers.js';

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  registerSocketHandlers(io);

  return io;
}
```

**Step 3: Update index.ts to use Socket.IO**

```typescript
// packages/server/src/index.ts
import { createServer } from 'http';
import { createApp } from './app.js';
import { createSocketServer } from './socket/index.js';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

async function main() {
  const app = createApp();
  const server = createServer(app);
  const io = createSocketServer(server);

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 4: Commit**

```bash
git add packages/server/src/
git commit -m "feat: add Socket.IO real-time piece synchronization"
```

---

## Phase 5: React Frontend (Lobby)

### Task 5.1: Initialize Vite + React

**Files:**
- Create: `packages/client/index.html`
- Create: `packages/client/vite.config.ts`
- Create: `packages/client/src/main.tsx`
- Create: `packages/client/src/App.tsx`

**Step 1: Create index.html**

```html
<!-- packages/client/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Multiplayer Puzzler</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Create vite.config.ts**

```typescript
// packages/client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
```

**Step 3: Create main.tsx**

```tsx
// packages/client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Step 4: Create App.tsx**

```tsx
// packages/client/src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Create } from './pages/Create';
import { Play } from './pages/Play';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<Create />} />
      <Route path="/play/:slug" element={<Play />} />
    </Routes>
  );
}
```

**Step 5: Create index.css**

```css
/* packages/client/src/index.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #eee;
  min-height: 100vh;
}

a {
  color: #4fc3f7;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

button {
  cursor: pointer;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  transition: transform 0.1s, box-shadow 0.1s;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

button:active {
  transform: translateY(0);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: #333;
  color: white;
}
```

**Step 6: Create placeholder pages**

```tsx
// packages/client/src/pages/Home.tsx
import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Multiplayer Puzzler</h1>
      <p style={{ margin: '20px 0' }}>Solve jigsaw puzzles together in real-time</p>
      <Link to="/create">
        <button className="btn-primary">Create New Puzzle</button>
      </Link>
    </div>
  );
}
```

```tsx
// packages/client/src/pages/Create.tsx
export function Create() {
  return <div>Create page - coming soon</div>;
}
```

```tsx
// packages/client/src/pages/Play.tsx
export function Play() {
  return <div>Play page - coming soon</div>;
}
```

**Step 7: Commit**

```bash
git add packages/client/
git commit -m "feat: initialize React frontend with Vite and routing"
```

---

### Task 5.2: Add Auth Store and API Client

**Files:**
- Create: `packages/client/src/stores/auth.ts`
- Create: `packages/client/src/lib/api.ts`

**Step 1: Create API client**

```typescript
// packages/client/src/lib/api.ts
const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return res.json();
}

export const api = {
  auth: {
    anonymous: () => request<{ token: string; displayName: string; sessionId: string }>('/auth/anonymous', { method: 'POST' }),
    me: () => request<{ sessionId: string; displayName: string; userId: string | null }>('/auth/me'),
  },
  images: {
    list: () => request<Array<{ id: string; url: string; name: string; width: number; height: number }>>('/images'),
    get: (id: string) => request<{ id: string; url: string; name: string; width: number; height: number }>(`/images/${id}`),
  },
  games: {
    create: (data: { imageId: string; pieceCount: number; tileType: string }) =>
      request<{ id: string; urlSlug: string; pieceCount: number; imageUrl: string }>('/games', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (slug: string) =>
      request<{
        id: string;
        urlSlug: string;
        pieceCount: number;
        tileType: string;
        imageUrl: string;
        imageWidth: number;
        imageHeight: number;
        status: string;
        isAdmin: boolean;
      }>(`/games/${slug}`),
    getStencil: (slug: string) => request<any>(`/games/${slug}/stencil`),
    getState: (slug: string) => request<any>(`/games/${slug}/state`),
  },
};
```

**Step 2: Create auth store**

```typescript
// packages/client/src/stores/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

interface AuthState {
  token: string | null;
  sessionId: string | null;
  displayName: string | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      sessionId: null,
      displayName: null,
      isLoading: true,

      initialize: async () => {
        const { token } = get();

        if (token) {
          try {
            const session = await api.auth.me();
            set({
              sessionId: session.sessionId,
              displayName: session.displayName,
              isLoading: false,
            });
            return;
          } catch {
            // Token invalid, create new anonymous session
          }
        }

        // Create anonymous session
        const session = await api.auth.anonymous();
        localStorage.setItem('token', session.token);
        set({
          token: session.token,
          sessionId: session.sessionId,
          displayName: session.displayName,
          isLoading: false,
        });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, sessionId: null, displayName: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
```

**Step 3: Update App.tsx to initialize auth**

```tsx
// packages/client/src/App.tsx
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './stores/auth';
import { Home } from './pages/Home';
import { Create } from './pages/Create';
import { Play } from './pages/Play';

export default function App() {
  const { initialize, isLoading } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<Create />} />
      <Route path="/play/:slug" element={<Play />} />
    </Routes>
  );
}
```

**Step 4: Commit**

```bash
git add packages/client/src/
git commit -m "feat: add auth store and API client"
```

---

### Task 5.3: Create Puzzle Creation Page

**Files:**
- Modify: `packages/client/src/pages/Create.tsx`

**Step 1: Implement Create page**

```tsx
// packages/client/src/pages/Create.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const PIECE_COUNTS = [200, 300, 400, 500, 600, 700, 800, 900];

export function Create() {
  const navigate = useNavigate();
  const [images, setImages] = useState<Array<{ id: string; url: string; name: string }>>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pieceCount, setPieceCount] = useState(400);
  const [tileType, setTileType] = useState('classic');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.images.list().then(setImages).catch(console.error);
  }, []);

  async function handleCreate() {
    if (!selectedImage) {
      setError('Please select an image');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const game = await api.games.create({
        imageId: selectedImage,
        pieceCount,
        tileType,
      });
      navigate(`/play/${game.urlSlug}`);
    } catch (err: any) {
      setError(err.message);
      setIsCreating(false);
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: 800, margin: '0 auto' }}>
      <h1>Create New Puzzle</h1>

      <section style={{ marginTop: 30 }}>
        <h2>1. Select an Image</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16, marginTop: 16 }}>
          {images.map((img) => (
            <div
              key={img.id}
              onClick={() => setSelectedImage(img.id)}
              style={{
                cursor: 'pointer',
                border: selectedImage === img.id ? '3px solid #667eea' : '3px solid transparent',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <img src={img.url} alt={img.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
              <div style={{ padding: 8, background: '#222', textAlign: 'center' }}>{img.name}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>2. Number of Pieces</h2>
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {PIECE_COUNTS.map((count) => (
            <button
              key={count}
              onClick={() => setPieceCount(count)}
              className={pieceCount === count ? 'btn-primary' : 'btn-secondary'}
            >
              {count}
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>3. Tile Style</h2>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            onClick={() => setTileType('classic')}
            className={tileType === 'classic' ? 'btn-primary' : 'btn-secondary'}
          >
            Classic
          </button>
          <button disabled style={{ opacity: 0.5 }} className="btn-secondary">
            Pentagon (Coming Soon)
          </button>
        </div>
      </section>

      {error && (
        <div style={{ marginTop: 20, padding: 16, background: '#ff5252', borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 40 }}>
        <button
          onClick={handleCreate}
          disabled={isCreating || !selectedImage}
          className="btn-primary"
          style={{ width: '100%', padding: 16, fontSize: 18 }}
        >
          {isCreating ? 'Creating...' : 'Create Puzzle'}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/client/src/pages/Create.tsx
git commit -m "feat: add puzzle creation page"
```

---

## Phase 6: PixiJS Game Canvas

### Task 6.1: Create PixiJS Game Component

**Files:**
- Create: `packages/client/src/components/PuzzleCanvas.tsx`
- Create: `packages/client/src/game/Game.ts`
- Create: `packages/client/src/game/SpriteSheetGenerator.ts`

**Step 1: Create SpriteSheetGenerator**

```typescript
// packages/client/src/game/SpriteSheetGenerator.ts
import type { Stencil, Piece } from '@mp-puzzler/shared';

export interface SpriteFrame {
  pieceIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GeneratedSpriteSheet {
  canvas: HTMLCanvasElement;
  frames: SpriteFrame[];
}

export async function generateSpriteSheet(
  imageUrl: string,
  stencil: Stencil
): Promise<GeneratedSpriteSheet> {
  // Load image
  const image = await loadImage(imageUrl);

  // Calculate sprite sheet dimensions (simple row packing for now)
  const padding = 2;
  const maxWidth = 4096;
  let currentX = 0;
  let currentY = 0;
  let rowHeight = 0;
  let sheetWidth = 0;
  let sheetHeight = 0;

  const frames: SpriteFrame[] = [];

  // First pass: calculate positions
  for (const piece of stencil.pieces) {
    const width = Math.ceil(piece.bounds.w) + padding * 2;
    const height = Math.ceil(piece.bounds.h) + padding * 2;

    if (currentX + width > maxWidth) {
      currentX = 0;
      currentY += rowHeight + padding;
      rowHeight = 0;
    }

    frames.push({
      pieceIndex: piece.index,
      x: currentX,
      y: currentY,
      width: width - padding * 2,
      height: height - padding * 2,
    });

    currentX += width;
    rowHeight = Math.max(rowHeight, height);
    sheetWidth = Math.max(sheetWidth, currentX);
  }
  sheetHeight = currentY + rowHeight;

  // Create sprite sheet canvas
  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;
  const ctx = canvas.getContext('2d')!;

  // Second pass: render pieces
  for (let i = 0; i < stencil.pieces.length; i++) {
    const piece = stencil.pieces[i];
    const frame = frames[i];

    ctx.save();
    ctx.translate(frame.x + padding, frame.y + padding);

    // Create clipping path
    const path = new Path2D(piece.path);
    ctx.translate(-piece.bounds.x, -piece.bounds.y);
    ctx.clip(path);

    // Draw image portion
    ctx.drawImage(image, 0, 0);

    ctx.restore();
  }

  return { canvas, frames };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
```

**Step 2: Create Game class**

```typescript
// packages/client/src/game/Game.ts
import { Application, Container, Sprite, Texture, Graphics } from 'pixi.js';
import type { Stencil, PieceState, GameState } from '@mp-puzzler/shared';
import { generateSpriteSheet, GeneratedSpriteSheet } from './SpriteSheetGenerator';

export class Game {
  private app: Application;
  private surface: Container;
  private panel: Container;
  private pieces: Map<number, Sprite> = new Map();
  private spriteSheet: GeneratedSpriteSheet | null = null;
  private stencil: Stencil | null = null;

  private isDragging = false;
  private draggedPiece: Sprite | null = null;
  private dragOffset = { x: 0, y: 0 };

  private onPieceGrab?: (pieceIndex: number) => void;
  private onPieceMove?: (pieceIndex: number, x: number, y: number) => void;
  private onPieceDrop?: (pieceIndex: number, x: number, y: number, rotation: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.app = new Application();
    this.surface = new Container();
    this.panel = new Container();
  }

  async init(canvas: HTMLCanvasElement) {
    await this.app.init({
      canvas,
      resizeTo: canvas.parentElement!,
      backgroundColor: 0x1a1a2e,
      antialias: true,
    });

    // Setup containers
    this.surface.sortableChildren = true;
    this.app.stage.addChild(this.surface);
    this.app.stage.addChild(this.panel);

    // Setup viewport controls
    this.setupViewportControls();
  }

  async loadPuzzle(imageUrl: string, stencil: Stencil, state: GameState) {
    this.stencil = stencil;

    // Generate sprite sheet
    this.spriteSheet = await generateSpriteSheet(imageUrl, stencil);
    const baseTexture = Texture.from(this.spriteSheet.canvas);

    // Create sprites for each piece
    for (const frame of this.spriteSheet.frames) {
      const piece = stencil.pieces[frame.pieceIndex];
      const pieceState = state.pieces.find(p => p.index === frame.pieceIndex)!;

      const texture = new Texture({
        source: baseTexture.source,
        frame: {
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
        },
      });

      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.eventMode = 'static';
      sprite.cursor = 'grab';

      // Set position from state
      if (pieceState.inPanel) {
        sprite.x = 100 + (pieceState.panelOrder || 0) * 80;
        sprite.y = this.app.screen.height - 60;
      } else {
        sprite.x = pieceState.x + piece.bounds.w / 2;
        sprite.y = pieceState.y + piece.bounds.h / 2;
      }
      sprite.rotation = pieceState.rotation;

      // Store piece index
      (sprite as any).pieceIndex = frame.pieceIndex;

      // Setup drag handlers
      this.setupPieceDrag(sprite);

      this.pieces.set(frame.pieceIndex, sprite);
      this.surface.addChild(sprite);
    }
  }

  private setupPieceDrag(sprite: Sprite) {
    sprite.on('pointerdown', (e) => {
      if (this.isDragging) return;

      this.isDragging = true;
      this.draggedPiece = sprite;
      sprite.cursor = 'grabbing';
      sprite.zIndex = 1000;

      const pos = e.global;
      this.dragOffset.x = pos.x - sprite.x;
      this.dragOffset.y = pos.y - sprite.y;

      const pieceIndex = (sprite as any).pieceIndex;
      this.onPieceGrab?.(pieceIndex);
    });

    sprite.on('globalpointermove', (e) => {
      if (!this.isDragging || this.draggedPiece !== sprite) return;

      const pos = e.global;
      sprite.x = pos.x - this.dragOffset.x;
      sprite.y = pos.y - this.dragOffset.y;

      const pieceIndex = (sprite as any).pieceIndex;
      this.onPieceMove?.(pieceIndex, sprite.x, sprite.y);
    });

    sprite.on('pointerup', () => {
      if (this.draggedPiece !== sprite) return;

      this.isDragging = false;
      sprite.cursor = 'grab';
      sprite.zIndex = 0;

      const pieceIndex = (sprite as any).pieceIndex;
      this.onPieceDrop?.(pieceIndex, sprite.x, sprite.y, sprite.rotation);

      this.draggedPiece = null;
    });

    sprite.on('pointerupoutside', () => {
      if (this.draggedPiece !== sprite) return;

      this.isDragging = false;
      sprite.cursor = 'grab';
      sprite.zIndex = 0;

      const pieceIndex = (sprite as any).pieceIndex;
      this.onPieceDrop?.(pieceIndex, sprite.x, sprite.y, sprite.rotation);

      this.draggedPiece = null;
    });
  }

  private setupViewportControls() {
    // Zoom with mouse wheel
    this.app.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      if (e.ctrlKey && this.draggedPiece) {
        // Rotate piece
        this.draggedPiece.rotation += e.deltaY * 0.01;
      } else {
        // Zoom viewport
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.surface.scale.x *= scaleFactor;
        this.surface.scale.y *= scaleFactor;
      }
    });
  }

  // Public API for socket events
  setHandlers(handlers: {
    onPieceGrab: (pieceIndex: number) => void;
    onPieceMove: (pieceIndex: number, x: number, y: number) => void;
    onPieceDrop: (pieceIndex: number, x: number, y: number, rotation: number) => void;
  }) {
    this.onPieceGrab = handlers.onPieceGrab;
    this.onPieceMove = handlers.onPieceMove;
    this.onPieceDrop = handlers.onPieceDrop;
  }

  updatePiecePosition(pieceIndex: number, x: number, y: number) {
    const sprite = this.pieces.get(pieceIndex);
    if (sprite && sprite !== this.draggedPiece) {
      sprite.x = x;
      sprite.y = y;
    }
  }

  updatePieceRotation(pieceIndex: number, rotation: number) {
    const sprite = this.pieces.get(pieceIndex);
    if (sprite && sprite !== this.draggedPiece) {
      sprite.rotation = rotation;
    }
  }

  destroy() {
    this.app.destroy(true);
  }
}
```

**Step 3: Create PuzzleCanvas component**

```tsx
// packages/client/src/components/PuzzleCanvas.tsx
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@mp-puzzler/shared';
import { Game } from '../game/Game';
import { api } from '../lib/api';

interface Props {
  gameSlug: string;
}

export function PuzzleCanvas({ gameSlug }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const game = new Game(canvas);
    gameRef.current = game;

    async function init() {
      await game.init(canvas);

      // Load game data
      const [gameData, stencil, state] = await Promise.all([
        api.games.get(gameSlug),
        api.games.getStencil(gameSlug),
        api.games.getState(gameSlug),
      ]);

      await game.loadPuzzle(gameData.imageUrl, stencil, state);

      // Connect socket
      const token = localStorage.getItem('token');
      const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
        auth: { token, gameSlug },
      });
      socketRef.current = socket;

      // Setup game handlers
      game.setHandlers({
        onPieceGrab: (pieceIndex) => {
          socket.emit('piece:grab', { pieceIndex });
        },
        onPieceMove: (pieceIndex, x, y) => {
          socket.emit('piece:move', { pieceIndex, x, y });
        },
        onPieceDrop: (pieceIndex, x, y, rotation) => {
          socket.emit('piece:drop', { pieceIndex, x, y, rotation }, (response) => {
            if (response.snapped) {
              // Play snap sound, update position
            }
          });
        },
      });

      // Handle socket events
      socket.on('piece:moved', ({ pieceIndex, x, y }) => {
        game.updatePiecePosition(pieceIndex, x, y);
      });

      socket.on('piece:rotated', ({ pieceIndex, rotation }) => {
        game.updatePieceRotation(pieceIndex, rotation);
      });

      socket.on('piece:dropped', ({ pieceIndex, x, y, rotation }) => {
        game.updatePiecePosition(pieceIndex, x, y);
        game.updatePieceRotation(pieceIndex, rotation);
      });
    }

    init();

    return () => {
      socketRef.current?.disconnect();
      gameRef.current?.destroy();
    };
  }, [gameSlug]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
```

**Step 4: Update Play page**

```tsx
// packages/client/src/pages/Play.tsx
import { useParams } from 'react-router-dom';
import { PuzzleCanvas } from '../components/PuzzleCanvas';

export function Play() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return <div>Invalid game URL</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <PuzzleCanvas gameSlug={slug} />
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add packages/client/src/
git commit -m "feat: add PixiJS puzzle canvas with piece rendering and drag"
```

---

## Phase 7: Integration & Polish

### Task 7.1: Add Snap Detection

**Files:**
- Create: `packages/server/src/services/snap.ts`
- Modify: `packages/server/src/socket/handlers.ts`

**Step 1: Create snap detection service**

```typescript
// packages/server/src/services/snap.ts
import { PrismaClient } from '@prisma/client';
import type { Stencil, Piece } from '@mp-puzzler/shared';

const prisma = new PrismaClient();

const POSITION_THRESHOLD = 0.1; // 10% of piece width
const ROTATION_THRESHOLD = Math.PI / 5; // ~36 degrees (10% of full rotation)

interface SnapResult {
  snapped: boolean;
  snappedEdges: string[];
  newPosition: { x: number; y: number };
  newRotation: number;
  newLockGroup: number[];
}

export async function checkSnap(
  gameId: string,
  pieceIndex: number,
  x: number,
  y: number,
  rotation: number
): Promise<SnapResult> {
  // Get game with stencil
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { puzzle: true },
  });

  if (!game) {
    return { snapped: false, snappedEdges: [], newPosition: { x, y }, newRotation: rotation, newLockGroup: [] };
  }

  const stencil = game.puzzle.stencilData as Stencil;
  const piece = stencil.pieces[pieceIndex];
  const pieceWidth = piece.bounds.w;
  const threshold = pieceWidth * POSITION_THRESHOLD;

  // Normalize rotation
  rotation = normalizeRotation(rotation);

  // Get current piece state and neighbors
  const pieceState = await prisma.pieceState.findFirst({
    where: { gameId, pieceIndex },
  });

  const snappedEdges: string[] = [];
  let newX = x;
  let newY = y;
  let newRotation = rotation;

  // Check each edge
  for (const edge of piece.edges) {
    const neighborState = await prisma.pieceState.findFirst({
      where: { gameId, pieceIndex: edge.neighborIndex },
    });

    if (!neighborState || neighborState.inPanel) continue;

    const neighborPiece = stencil.pieces[edge.neighborIndex];

    // Calculate expected position relative to neighbor
    const expectedDx = piece.correctPosition.x - neighborPiece.correctPosition.x;
    const expectedDy = piece.correctPosition.y - neighborPiece.correctPosition.y;

    const expectedX = neighborState.x + expectedDx;
    const expectedY = neighborState.y + expectedDy;

    // Check position distance
    const dx = x - expectedX;
    const dy = y - expectedY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check rotation difference
    const rotationDiff = Math.abs(normalizeRotation(rotation - neighborState.rotation));

    if (distance < threshold && rotationDiff < ROTATION_THRESHOLD) {
      // Snap!
      snappedEdges.push(edge.edgeId);
      newX = expectedX;
      newY = expectedY;
      newRotation = neighborState.rotation;
    }
  }

  // If snapped, merge lock groups
  let newLockGroup: number[] = [pieceIndex];

  if (snappedEdges.length > 0) {
    // Mark edges as solved
    for (const edgeId of snappedEdges) {
      const [a, b] = edgeId.split('-').map(Number);
      await prisma.edgeState.updateMany({
        where: {
          gameId,
          OR: [
            { pieceA: a, pieceB: b },
            { pieceA: b, pieceB: a },
          ],
        },
        data: { solved: true },
      });
    }

    // Find or create lock group
    const neighborStates = await prisma.pieceState.findMany({
      where: {
        gameId,
        pieceIndex: { in: piece.edges.map(e => e.neighborIndex) },
        lockGroup: { not: null },
      },
    });

    let lockGroupId: number;
    if (neighborStates.length > 0) {
      lockGroupId = neighborStates[0].lockGroup!;
    } else {
      // Create new lock group ID
      const maxGroup = await prisma.pieceState.aggregate({
        where: { gameId },
        _max: { lockGroup: true },
      });
      lockGroupId = (maxGroup._max.lockGroup || 0) + 1;
    }

    // Update this piece's lock group
    await prisma.pieceState.update({
      where: { gameId_pieceIndex: { gameId, pieceIndex } },
      data: { lockGroup: lockGroupId, x: newX, y: newY, rotation: newRotation },
    });

    // Get all pieces in lock group
    const groupPieces = await prisma.pieceState.findMany({
      where: { gameId, lockGroup: lockGroupId },
    });
    newLockGroup = groupPieces.map(p => p.pieceIndex);
  }

  return {
    snapped: snappedEdges.length > 0,
    snappedEdges,
    newPosition: { x: newX, y: newY },
    newRotation,
    newLockGroup,
  };
}

function normalizeRotation(r: number): number {
  while (r < 0) r += Math.PI * 2;
  while (r >= Math.PI * 2) r -= Math.PI * 2;
  return r;
}
```

**Step 2: Update socket handler to use snap detection**

```typescript
// In packages/server/src/socket/handlers.ts
// Update the piece:drop handler to use checkSnap:

import { checkSnap } from '../services/snap.js';

// Replace the piece:drop handler body with:
socket.on('piece:drop', async ({ pieceIndex, x, y, rotation }, callback) => {
  const owners = pieceOwners.get(gameId)!;

  if (owners.get(pieceIndex) !== sessionId) {
    callback({ error: 'not_owner' });
    return;
  }

  // Get lock group pieces
  const pieceState = await prisma.pieceState.findFirst({
    where: { gameId, pieceIndex },
  });
  let lockGroupPieces: number[] = [pieceIndex];
  if (pieceState?.lockGroup !== null && pieceState?.lockGroup !== undefined) {
    const groupPieces = await prisma.pieceState.findMany({
      where: { gameId, lockGroup: pieceState.lockGroup },
    });
    lockGroupPieces = groupPieces.map((p) => p.pieceIndex);
  }

  // Release ownership
  lockGroupPieces.forEach((idx) => owners.delete(idx));

  // Check for snap
  const snapResult = await checkSnap(gameId, pieceIndex, x, y, rotation);

  // Save position (use snapped position if applicable)
  await prisma.pieceState.update({
    where: { gameId_pieceIndex: { gameId, pieceIndex } },
    data: {
      x: snapResult.newPosition.x,
      y: snapResult.newPosition.y,
      rotation: snapResult.newRotation,
      inPanel: false,
      panelOrder: null,
    },
  });

  callback({
    x: snapResult.newPosition.x,
    y: snapResult.newPosition.y,
    rotation: snapResult.newRotation,
    snapped: snapResult.snapped,
    edges: snapResult.snappedEdges,
  });

  socket.to(`game:${gameSlug}`).emit('piece:dropped', {
    pieceIndex,
    x: snapResult.newPosition.x,
    y: snapResult.newPosition.y,
    rotation: snapResult.newRotation,
    snapped: snapResult.snapped,
    newLockGroup: snapResult.snapped ? snapResult.newLockGroup : null,
  });

  if (snapResult.snapped) {
    socket.to(`game:${gameSlug}`).emit('piece:snapped', {
      edges: snapResult.snappedEdges,
      lockGroup: snapResult.newLockGroup,
    });
  }

  // Check for game completion
  const unsolvedEdges = await prisma.edgeState.count({
    where: { gameId, solved: false },
  });

  if (unsolvedEdges === 0) {
    await prisma.game.update({
      where: { id: gameId },
      data: { status: 'completed', completedAt: new Date() },
    });

    io.to(`game:${gameSlug}`).emit('game:completed', {
      completedAt: new Date().toISOString(),
    });
  }
});
```

**Step 3: Commit**

```bash
git add packages/server/src/
git commit -m "feat: add snap detection and lock group merging"
```

---

### Task 7.2: Add Cursor Presence Display

**Files:**
- Modify: `packages/client/src/game/Game.ts`
- Modify: `packages/client/src/components/PuzzleCanvas.tsx`

**Step 1: Add cursor rendering to Game class**

```typescript
// Add to packages/client/src/game/Game.ts

// Add import
import { Text, TextStyle } from 'pixi.js';

// Add property
private cursors: Map<string, { sprite: Graphics; label: Text }> = new Map();

// Add method
addCursor(playerId: string, displayName: string) {
  if (this.cursors.has(playerId)) return;

  const cursor = new Graphics();
  cursor.circle(0, 0, 8);
  cursor.fill({ color: 0x4fc3f7, alpha: 0.8 });
  cursor.visible = false;

  const label = new Text({
    text: displayName,
    style: new TextStyle({
      fontSize: 12,
      fill: 0xffffff,
      fontFamily: 'sans-serif',
    }),
  });
  label.y = 12;
  label.anchor.set(0.5, 0);
  cursor.addChild(label);

  this.surface.addChild(cursor);
  this.cursors.set(playerId, { sprite: cursor, label });
}

updateCursor(playerId: string, x: number, y: number) {
  const cursor = this.cursors.get(playerId);
  if (!cursor) return;

  cursor.sprite.x = x;
  cursor.sprite.y = y;
  cursor.sprite.visible = true;
}

removeCursor(playerId: string) {
  const cursor = this.cursors.get(playerId);
  if (!cursor) return;

  this.surface.removeChild(cursor.sprite);
  this.cursors.delete(playerId);
}
```

**Step 2: Update PuzzleCanvas to handle cursor events**

```tsx
// Add to useEffect in PuzzleCanvas.tsx after socket setup:

socket.on('player:joined', ({ id, displayName }) => {
  game.addCursor(id, displayName);
});

socket.on('player:left', ({ playerId }) => {
  game.removeCursor(playerId);
});

socket.on('cursor:moved', ({ playerId, displayName, x, y }) => {
  if (!gameRef.current!.cursors?.has(playerId)) {
    game.addCursor(playerId, displayName);
  }
  game.updateCursor(playerId, x, y);
});

// Add cursor move broadcast
canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  socket.emit('cursor:move', { x, y });
});
```

**Step 3: Commit**

```bash
git add packages/client/src/
git commit -m "feat: add multiplayer cursor presence display"
```

---

### Task 7.3: Seed Curated Images

**Files:**
- Create: `packages/server/prisma/seed.ts`
- Modify: `packages/server/package.json`

**Step 1: Create seed script**

```typescript
// packages/server/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
```

**Step 2: Update package.json**

```json
// Add to packages/server/package.json scripts:
"db:seed": "tsx prisma/seed.ts"

// Add to prisma section:
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

**Step 3: Create public images directory and add placeholder images**

```bash
mkdir -p packages/client/public/images
# Add 6 placeholder images (or download from Unsplash)
```

**Step 4: Commit**

```bash
git add packages/server/prisma/seed.ts packages/server/package.json packages/client/public/
git commit -m "feat: add database seed script with curated images"
```

---

## Final Checklist

- [ ] All tests passing: `npm test`
- [ ] Server starts: `npm run dev` (from packages/server)
- [ ] Client starts: `npm run dev` (from packages/client)
- [ ] Can create anonymous session
- [ ] Can view image gallery
- [ ] Can create new puzzle
- [ ] Can load puzzle canvas
- [ ] Can drag pieces
- [ ] Piece movements sync between multiple browser tabs
- [ ] Pieces snap when placed correctly
- [ ] Game completes when all pieces placed
