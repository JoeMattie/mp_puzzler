# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multiplayer jigsaw puzzle game where users create puzzles from images and solve them collaboratively in real-time. Monorepo with pnpm workspaces + Turbo.

## Commands

```bash
# Development (starts server + client)
pnpm dev

# Build all packages
pnpm build

# Test all packages
pnpm test

# Test single package
pnpm -F @mp-puzzler/server test
pnpm -F @mp-puzzler/client test

# Run single test file
pnpm -F @mp-puzzler/server test src/__tests__/games.test.ts

# Database operations
pnpm -F @mp-puzzler/server prisma migrate dev    # Create migration
pnpm -F @mp-puzzler/server prisma migrate deploy # Apply migrations
pnpm -F @mp-puzzler/server db:seed               # Seed curated images
```

## Architecture

```
packages/
├── client/    # React + PixiJS frontend (port 5173)
├── server/    # Express + Socket.IO backend (port 3001)
└── shared/    # TypeScript types + Zod schemas
```

### Data Flow

1. **REST API** (`/api/*`): Game creation, auth, image management
2. **Socket.IO**: Real-time piece movement, cursor presence, snap detection
3. **Vite proxy**: Client dev server proxies `/api` and `/socket.io` to backend

### Key Components

**Server:**
- `src/socket/handlers.ts` - Socket.IO event handlers (piece:grab/move/drop, cursor:move)
- `src/services/games.ts` - Game CRUD + stencil generation orchestration
- `src/services/stencil/classic.ts` - Voronoi-based puzzle piece geometry
- `src/services/snap.ts` - Edge detection + lock group merging

**Client:**
- `src/game/Game.ts` - PixiJS application (rendering, drag/drop, zoom/pan)
- `src/game/SpriteSheetGenerator.ts` - Canvas sprite sheet from image + stencil
- `src/stores/auth.ts` - Zustand store with localStorage persistence

**Shared:**
- `src/types.ts` - Socket event interfaces, Piece, GameState, Stencil types
- `src/schemas.ts` - Zod validation for API inputs

### Database Schema (Prisma)

Core models: `Session`, `Image`, `Puzzle`, `Game`, `PieceState`, `EdgeState`

- Game has unique 8-char slug (nanoid)
- Puzzle stores stencil geometry as JSON
- PieceState/EdgeState track per-game piece positions and snap states

### Real-Time Multiplayer

Ownership system prevents conflicts:
- `piece:grab` acquires lock on piece + its lock group
- `piece:drop` validates ownership, checks snaps, merges lock groups
- Lock groups form when pieces snap together (all pieces move as unit)

## Environment

Server requires `.env`:
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=3001
CLIENT_URL=http://localhost:5173
```

## Testing Notes

- Tests skip gracefully when database unavailable
- Server tests use Supertest for HTTP endpoints
- No E2E tests yet (manual testing)
