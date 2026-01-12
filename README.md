# Multiplayer Puzzler

A real-time collaborative jigsaw puzzle game where multiple players can solve puzzles together.

## Features

- Create puzzles from curated images with configurable piece counts
- Real-time multiplayer with live cursor presence
- Automatic piece snapping and lock group merging
- Desktop and mobile touch support
- Zoom, pan, and rotate the puzzle board

## Tech Stack

- **Frontend**: React, PixiJS, Vite, Zustand
- **Backend**: Express, Socket.IO, Prisma
- **Database**: PostgreSQL
- **Monorepo**: pnpm workspaces + Turborepo

## Prerequisites

- Node.js 18+
- pnpm 10+
- PostgreSQL (or Docker)

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/JoeMattie/mp_puzzler.git
cd mp_puzzler
pnpm install
```

### 2. Set Up Database

Using Docker:
```bash
docker compose up -d
```

Or configure your own PostgreSQL and update the connection string.

### 3. Configure Environment

Create `packages/server/.env`:
```env
DATABASE_URL=postgresql://puzzler:puzzler@localhost:5432/puzzler
JWT_SECRET=your-secret-key-here
PORT=3001
CLIENT_URL=http://localhost:5173
```

### 4. Initialize Database

```bash
pnpm -F @mp-puzzler/server prisma migrate deploy
pnpm -F @mp-puzzler/server db:seed
```

### 5. Start Development Server

```bash
pnpm dev
```

The app will be available at:
- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

## Development

### Project Structure

```
packages/
├── client/    # React + PixiJS frontend
├── server/    # Express + Socket.IO backend
└── shared/    # TypeScript types + Zod schemas
```

### Commands

```bash
# Start development (client + server with hot reload)
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test

# Test specific package
pnpm -F @mp-puzzler/server test
pnpm -F @mp-puzzler/client test

# Run single test file
pnpm -F @mp-puzzler/server test src/__tests__/games.test.ts

# Lint all packages
pnpm lint
```

### Database Operations

```bash
# Create a new migration
pnpm -F @mp-puzzler/server prisma migrate dev

# Apply migrations
pnpm -F @mp-puzzler/server prisma migrate deploy

# Seed curated images
pnpm -F @mp-puzzler/server db:seed

# Open Prisma Studio
pnpm -F @mp-puzzler/server prisma studio
```

## Controls

### Desktop

| Action | Control |
|--------|---------|
| Move piece | Left-click + drag |
| Rotate piece | Right-click + drag on piece |
| Zoom board | Mouse wheel |
| Pan board | Left-click + drag on empty space |
| Rotate board | Right-click + drag on empty space |
| Scroll tray | Mouse wheel over tray, or drag |

### Mobile / Touch

| Action | Control |
|--------|---------|
| Move piece | Touch + drag |
| Rotate piece | Two-finger rotate on piece |
| Zoom board | Pinch gesture |
| Pan board | One-finger drag on empty space |
| Rotate board | Two-finger rotate on empty space, or three-finger rotate anywhere |
| Scroll tray | Swipe horizontally on tray |

## Testing

Tests use Vitest and run against a test database.

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm -F @mp-puzzler/server test -- --coverage
```

Tests will skip gracefully if the database is unavailable.

## Architecture

### Data Flow

1. **REST API** (`/api/*`) - Game creation, authentication, image management
2. **Socket.IO** - Real-time piece movement, cursor presence, snap detection
3. **Vite Proxy** - Development server proxies API and WebSocket to backend

### Real-Time Multiplayer

The ownership system prevents conflicts:
- `piece:grab` acquires a lock on the piece and its lock group
- `piece:drop` validates ownership, checks for snaps, merges lock groups
- Lock groups form when pieces snap together (all pieces move as a unit)

### Database Models

- **Session** - Anonymous or authenticated user sessions
- **Image** - Curated puzzle images with dimensions
- **Puzzle** - Generated stencil geometry (piece shapes)
- **Game** - Active puzzle instance with unique URL slug
- **PieceState** - Per-game piece positions and rotations
- **EdgeState** - Tracks which edges have been solved

## License

MIT
