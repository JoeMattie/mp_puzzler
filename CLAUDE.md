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

## Features

### Debug Mode
- Toggle with tilde key (`~`)
- Highlights pieces with matching edges when hovering
- Sets global `window.DEBUG` flag for additional debugging
- Useful for visualizing which pieces connect together

### Piece Tray
- Pieces dropped from board to tray are placed at cursor position
- Tray pieces can be rotated with right-click
- Pieces are constrained vertically within tray bounds
- Tray pieces automatically scale based on piece size to fit properly
- Dynamic spacing adjusts with scale

### Puzzle Board
- Semi-transparent cyan outline shows completed puzzle boundary
- Helps visualize where pieces should end up

### Development
- WebGL context loss handlers prevent HMR-related crashes
- Docker compose supports full-stack development environment
- Proper cleanup on component unmount prevents resource leaks

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

## Coding Guidelines

- **Git Workflow**: Always work on feature branches, not directly on main. Create a feature branch for each task/feature.
- **PixiJS**: Use PixiJS builtins whenever possible (coordinate transforms, hit testing, containers, etc.) rather than manual implementations
- **Type Safety**: Always run `pnpm build` after making changes to catch TypeScript errors. The build runs `tsc` which catches type mismatches that could cause runtime bugs (e.g., accessing non-existent properties)
- **Planning**: Use superpowers skills (brainstorming, writing-plans, executing-plans, etc.) for multi-step tasks. Plan before implementing.
- **Documentation**: Update this CLAUDE.md file with helpful information about processes, procedures, and learnings when appropriate. If unsure whether something should be documented, ask.

## Verification Steps

Before considering work complete, always run:

```bash
# Build all packages (includes TypeScript type checking)
pnpm build

# Run tests
pnpm test
```

TypeScript errors from `tsc` during build are critical - they often indicate bugs like accessing wrong property names or type mismatches that will cause runtime failures.

## PixiJS v8 Reference

This project uses PixiJS v8. Key API details:

### Coordinate Systems

Three coordinate systems:
- **Local**: Relative to the object's parent container
- **Global/World**: Relative to the stage (0,0 at top-left of canvas)
- **Screen**: Relative to the browser viewport

### Container Coordinate Conversion

```typescript
// Convert local position to global (world) coordinates
const globalPos = container.toGlobal(new Point(localX, localY));

// Convert global position to container's local coordinates
const localPos = container.toLocal(new Point(globalX, globalY));

// Get container's own global position
const pos = container.getGlobalPosition();

// Convert from one container's space to another's
const posInOther = targetContainer.toLocal(point, sourceContainer);
```

### FederatedPointerEvent Coordinates

Pointer events provide multiple coordinate properties:

```typescript
sprite.on('pointermove', (e: FederatedPointerEvent) => {
  e.global    // Point - coordinates in world/stage space (most common)
  e.client    // Point - coordinates relative to canvas element
  e.screen    // Point - coordinates in renderer's screen space

  // Aliases
  e.globalX, e.globalY  // same as e.global.x, e.global.y
  e.clientX, e.clientY  // same as e.client.x, e.client.y

  // Convert to container-local coordinates
  const localPos = e.getLocalPosition(container);
});
```

### Key v8 Changes from v7

- **Async init**: `await app.init({...})` instead of `new Application({...})`
- **Canvas access**: `app.canvas` instead of `app.view`
- **No BaseTexture**: Use TextureSources instead
- **Children restriction**: Only Container can have children (not Sprite, Graphics, etc.)
- **Package structure**: Single import `import { ... } from 'pixi.js'`

### Documentation

- **LLM reference**: https://pixijs.com/llms.txt (quick overview for AI tools)
- Migration guide: https://pixijs.com/8.x/guides/migrations/v8
- Events guide: https://pixijs.com/8.x/guides/components/events
- Scene graph: https://pixijs.com/8.x/guides/concepts/scene-graph
