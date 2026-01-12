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

### 2. Choose Your Development Setup

You can run the app either **locally** (recommended for development) or fully in **Docker**.

#### Option A: Local Development (Recommended)

**Database only (Docker):**
```bash
docker compose up db -d
```

**Configure server environment:**
Create `packages/server/.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mp_puzzler
JWT_SECRET=your-secret-key-here
PORT=3001
CLIENT_URL=http://localhost:5173
```

**Initialize database:**
```bash
pnpm -F @mp-puzzler/server prisma migrate deploy
pnpm -F @mp-puzzler/server db:seed
```

**Start dev servers:**
```bash
pnpm dev
```

The app will be available at:
- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

#### Option B: Full Docker Stack

**Start all services:**
```bash
docker compose up --build
```

This starts PostgreSQL, backend server, and frontend client in containers with hot-reload support.

**Run database migrations (required on first startup):**
```bash
# Apply migrations directly to database
docker compose exec -T db psql -U postgres -d mp_puzzler < packages/server/prisma/migrations/0_init/migration.sql

# Seed the database (optional)
pnpm -F @mp-puzzler/server db:seed
```

**Note:** Due to a Prisma 7 configuration issue with `prisma migrate deploy`, migrations must be applied manually. See [GitHub Issue #28983](https://github.com/prisma/prisma/issues/28983) for details.

**Access the app:**
- **Client**: http://localhost:5173
- **Server**: http://localhost:3001
- **Database**: localhost:5432

**Note:** First startup may show "failed to create session" errors until migrations are run. After running migrations, the app will work normally.

**Stop all services:**
```bash
docker compose down
```

#### Option C: Local PostgreSQL

Configure your own PostgreSQL instance and update the connection string in `packages/server/.env`.


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
| Debug mode | Tilde key (`~`) - highlights matching edges on hover |

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
