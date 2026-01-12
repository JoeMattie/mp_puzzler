# Multiplayer Jigsaw Puzzle Game - Design Document

## Overview

A real-time multiplayer jigsaw puzzle game where users can:
- Select from curated images or upload their own
- Choose piece count (200-900) and tiling style (classic or pentagonal)
- Share a unique URL with other players
- Collaborate in real-time to solve the puzzle

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend (Lobby) | React + TypeScript |
| Frontend (Game) | PixiJS |
| Backend | Node.js + Express/Fastify |
| Real-time | Socket.IO |
| Database | PostgreSQL |
| Auth | Optional accounts (anonymous allowed) + OAuth |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Desktop   │  │   Mobile    │  │   Tablet    │              │
│  │   Browser   │  │   Browser   │  │   Browser   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │ HTTPS + WSS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NODE.JS SERVER                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Express/Fastify                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐  │   │
│  │  │  Auth   │ │  Game   │ │  Image  │ │   Stencil     │  │   │
│  │  │ Module  │ │   API   │ │   API   │ │  Generator    │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └───────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Socket.IO                            │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌───────────────────┐  │   │
│  │  │ Room Mgmt   │ │ Piece Sync  │ │  Cursor/Presence  │  │   │
│  │  └─────────────┘ └─────────────┘ └───────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┬───┘
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────────────┐ │
│  │  Users  │ │  Games  │ │ Puzzles │ │  Pieces & Edges       │ │
│  └─────────┘ └─────────┘ └─────────┘ └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Key modules:**
- **Auth Module**: Optional accounts, anonymous session tokens, OAuth integration
- **Game API**: Create/join games, admin actions, game state
- **Image API**: Curated gallery listing, user upload handling
- **Stencil Generator**: Computes piece geometry, edge relationships, outputs JSON
- **Room Mgmt**: Socket.IO rooms per game, join/leave handling
- **Piece Sync**: Broadcasts piece movements, handles conflict resolution
- **Cursor/Presence**: Broadcasts player cursor positions, emoji reactions

---

## Data Model

```sql
-- Optional user accounts
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50) UNIQUE,
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  oauth_provider VARCHAR(50),
  oauth_id      VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Anonymous sessions (for non-registered players)
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  token         VARCHAR(255) UNIQUE NOT NULL,
  display_name  VARCHAR(50) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW(),
  last_seen     TIMESTAMP DEFAULT NOW()
);

-- Puzzle templates (the stencil + metadata, reusable)
CREATE TABLE puzzles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url     VARCHAR(500) NOT NULL,
  image_width   INT NOT NULL,
  image_height  INT NOT NULL,
  piece_count   INT NOT NULL,
  tile_type     VARCHAR(20) NOT NULL,
  stencil_data  JSONB NOT NULL,
  created_by    UUID REFERENCES sessions(id),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Game instances (a playable session with unique URL)
CREATE TABLE games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_slug      VARCHAR(20) UNIQUE NOT NULL,
  puzzle_id     UUID REFERENCES puzzles(id) NOT NULL,
  admin_session UUID REFERENCES sessions(id),
  status        VARCHAR(20) DEFAULT 'active',
  created_at    TIMESTAMP DEFAULT NOW(),
  completed_at  TIMESTAMP
);

-- Runtime piece state (positions, rotations, locks)
CREATE TABLE piece_states (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID REFERENCES games(id) NOT NULL,
  piece_index   INT NOT NULL,
  x             FLOAT NOT NULL,
  y             FLOAT NOT NULL,
  rotation      FLOAT NOT NULL,
  in_panel      BOOLEAN DEFAULT TRUE,
  panel_order   INT,
  lock_group    INT,
  UNIQUE(game_id, piece_index)
);

-- Edge connections (populated from stencil, tracks which are "solved")
CREATE TABLE edge_states (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID REFERENCES games(id) NOT NULL,
  piece_a       INT NOT NULL,
  piece_b       INT NOT NULL,
  solved        BOOLEAN DEFAULT FALSE,
  UNIQUE(game_id, piece_a, piece_b)
);
```

---

## Stencil Generation

The server generates puzzle geometry as a JSON stencil - the client uses this to render and mask image regions.

### Classic Tile Generation

1. Compute grid dimensions from piece count + image aspect ratio
   - Target: sqrt(piece_count) adjusted for aspect ratio
   - e.g., 400 pieces on 4:3 image → ~23x17 grid

2. For each cell, determine piece shape:
   - Edge pieces: 12 variants (4 corners + 8 edge types)
   - Interior pieces: 4 variants (tab/blank combos on each side)
   - Tab direction randomized but must match adjacent piece

3. Generate bezier curves for each edge:
   - Straight base line between corners
   - Tab: outward bulge with neck
   - Blank: inward cavity matching adjacent tab
   - Add slight randomization to curves for organic feel

### Pentagonal Tile Generation

1. User selects pentagon type (1-15)
   - Each type has specific angles/side ratios that tile the plane

2. Tile the image bounds with selected pentagon type
   - Use known tiling rules for that pentagon type
   - Clip to image boundaries

3. Group pentagons into 3-pentagon pieces
   - 16 grouping patterns based on adjacency
   - Ensures pieces are roughly similar in size

4. Generate piece outlines from grouped pentagon vertices

### Stencil Output Format

```json
{
  "pieces": [
    {
      "index": 0,
      "path": "M 0,0 C 10,5 15,5 25,0 ...",
      "bounds": { "x": 0, "y": 0, "w": 120, "h": 95 },
      "centroid": { "x": 60, "y": 47 },
      "correctPosition": { "x": 0, "y": 0 },
      "correctRotation": 0,
      "edges": [
        { "neighborIndex": 1, "edgeId": "0-1" },
        { "neighborIndex": 12, "edgeId": "0-12" }
      ]
    }
  ],
  "edges": [
    { "id": "0-1", "pieces": [0, 1], "type": "tab-blank" }
  ]
}
```

---

## Client Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        REACT APP                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     LOBBY VIEWS                          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐  │   │
│  │  │  Login  │ │  Image  │ │  Puzzle │ │  Join Game    │  │   │
│  │  │  Page   │ │ Gallery │ │ Config  │ │  (URL entry)  │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └───────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   GAME CONTAINER                         │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │              PIXI.JS CANVAS                      │    │   │
│  │  │  ┌───────────────────────────────────────────┐  │    │   │
│  │  │  │            PUZZLE SURFACE                  │  │    │   │
│  │  │  │  • Pan/zoom/rotate viewport               │  │    │   │
│  │  │  │  • Piece sprites from atlas               │  │    │   │
│  │  │  │  • Snap detection & lock groups           │  │    │   │
│  │  │  │  • Other players' cursors                 │  │    │   │
│  │  │  └───────────────────────────────────────────┘  │    │   │
│  │  │  ┌───────────────────────────────────────────┐  │    │   │
│  │  │  │            PIECE PANEL (docked)           │  │    │   │
│  │  │  │  • Scrollable in one axis                 │  │    │   │
│  │  │  │  • Randomized initial order               │  │    │   │
│  │  │  └───────────────────────────────────────────┘  │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────────┐   │   │
│  │  │ Players  │ │ Reactions│ │ Admin Controls         │   │   │
│  │  │ List     │ │ Bar      │ │ (if admin)             │   │   │
│  │  └──────────┘ └──────────┘ └────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Client Modules

| Module | Responsibility |
|--------|----------------|
| `SpriteSheetGenerator` | Loads image + stencil, generates atlas textures via offscreen canvas |
| `PuzzleSurface` | PixiJS container with viewport transform (pan/zoom/rotate) |
| `PieceManager` | Creates sprites, handles drag/rotate, detects snaps |
| `LockGroupManager` | Tracks which pieces are locked, moves groups together |
| `PiecePanel` | Docked scrollable panel, drag pieces to/from surface |
| `SocketSync` | Socket.IO client, broadcasts moves, receives updates |
| `CursorPresence` | Renders other players' cursors + names, handles reactions |
| `InputHandler` | Unified mouse/touch input, gesture detection (pinch, CTRL+scroll) |

### Sprite Sheet Generation (Client-side)

1. Fetch stencil JSON + original image
2. Create offscreen canvas
3. For each piece in stencil:
   - Calculate bounding box with padding for tabs
   - Draw image region with piece path as clipping mask
   - Pack into sprite sheet (bin packing algorithm)
4. Create PixiJS Spritesheet from packed texture
5. Generate sprites referencing their atlas regions

---

## Real-time Synchronization

### Socket Events

**Client → Server:**
| Event | Payload |
|-------|---------|
| `piece:grab` | `{ pieceIndex }` |
| `piece:move` | `{ pieceIndex, x, y }` |
| `piece:rotate` | `{ pieceIndex, rotation }` |
| `piece:drop` | `{ pieceIndex, x, y, rotation }` |
| `piece:panel` | `{ pieceIndex, panelOrder }` |
| `cursor:move` | `{ x, y }` |
| `reaction:send` | `{ emoji, x, y }` |

**Server → Client:**
| Event | Payload |
|-------|---------|
| `piece:grab:denied` | `{ pieceIndex, heldBy }` |
| `piece:grabbed` | `{ pieceIndex, lockGroup, byPlayer }` |
| `piece:moved` | `{ pieceIndex, x, y, byPlayer }` |
| `piece:rotated` | `{ pieceIndex, rotation, byPlayer }` |
| `piece:dropped` | `{ pieceIndex, x, y, rotation, snapped, newLockGroup }` |
| `piece:snapped` | `{ edges, lockGroup }` |
| `cursor:moved` | `{ playerId, displayName, x, y }` |
| `reaction:received` | `{ playerId, emoji, x, y }` |
| `player:joined` | `{ playerId, displayName, isAdmin }` |
| `player:left` | `{ playerId }` |
| `game:completed` | `{ stats }` |

### Conflict Resolution: Last Write Wins with Ownership

- When a player starts dragging, they "claim" the piece
- Server tracks: `{ pieceIndex: sessionId }` for active drags
- Other players see the piece as "held" (visual indicator)
- Other players cannot grab a held piece
- Ownership released on drop or disconnect
- Lock groups: claiming one piece claims the entire group

### Throttling Strategy

| Event | Throttle | Reason |
|-------|----------|--------|
| `piece:move` | 16ms (~60fps) | Smooth visual, limit bandwidth |
| `piece:rotate` | 16ms | Same as move |
| `cursor:move` | 50ms (~20fps) | Cursors need less precision |
| `piece:drop` | None | Critical state, always immediate |

---

## Game Flow

### Lifecycle

```
CREATING → ACTIVE → COMPLETED
```

### Detailed Flow

**1. Puzzle Creation (Lobby)**
- User selects image (gallery or upload)
- User selects piece count (200-900)
- User selects tile type (classic / pentagon 1-15)
- POST /api/games
- Server generates stencil
- Server returns { gameId, urlSlug }
- User redirected to /play/{urlSlug}

**2. Game Join**
- Player visits /play/{urlSlug}
- Client fetches game state
- If first player: assigned as admin
- Client fetches stencil + image
- Client generates sprite sheet
- Client connects to Socket.IO room
- If fresh game: pieces randomized to panel
- If continuing: pieces restored to saved positions

**3. Active Gameplay**
- Players drag pieces from panel to surface
- Players position and rotate pieces
- Snap detection on drop:
  - Position threshold: distance < piece_width * 0.1
  - Rotation threshold: |delta| < 36° (10% of 360°)
  - If match: snap, lock edges, merge lock groups
- Server persists state after each drop

**4. Admin Actions**
- Reset: Randomize all pieces back to panel, clear locks
- Continue: Default behavior, resume from saved state
- Admin sees modal on join if game has existing state

**5. Completion**
- All edges locked → game status = 'completed'
- Server broadcasts 'game:completed'
- Victory animation/screen shown
- Game remains viewable but not editable

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/anonymous` | Create anonymous session |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `POST` | `/api/auth/oauth/:provider` | OAuth callback |
| `POST` | `/api/auth/link` | Link anonymous session to account |
| `GET` | `/api/auth/me` | Get current user/session info |

### Images

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/images` | List curated gallery |
| `GET` | `/api/images/:id` | Get image metadata |
| `POST` | `/api/images/upload` | Upload user image |

### Games

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/games` | Create game |
| `GET` | `/api/games/:slug` | Get game metadata |
| `GET` | `/api/games/:slug/stencil` | Get stencil JSON |
| `GET` | `/api/games/:slug/state` | Get piece states |
| `POST` | `/api/games/:slug/reset` | Reset game (admin only) |
| `GET` | `/api/users/:id/games` | List user's games |

---

## Error Handling

### Connection Issues

| Scenario | Handling |
|----------|----------|
| Disconnect mid-drag | Release ownership after 5s, piece stays at last position |
| Reconnect | Fetch fresh state, rejoin room |
| Server restart | Auto-reconnect, re-fetch state |

### Race Conditions

| Scenario | Handling |
|----------|----------|
| Simultaneous grab | First processed wins, second denied |
| Drop during grab | Drop processes first, grab succeeds |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Admin leaves | Transfer to longest-connected player |
| All players leave | State persists, next visitor becomes admin |
| Idle 30+ days | Archive/delete old games |

---

## User Interaction

### Controls

**Desktop:**
- Pan: Click and drag on empty space
- Zoom: Mouse wheel
- Rotate viewport: (TBD - possibly Shift+wheel)
- Move piece: Click and drag
- Rotate piece: CTRL + mouse wheel while hovering

**Mobile/Touch:**
- Pan: One finger drag on empty space
- Zoom: Pinch gesture
- Move piece: Touch and drag
- Rotate piece: Hold piece with one finger, swipe with another

### Visual Feedback

- Snap sound when pieces connect
- Subtle highlight when hovering near correct placement
- Other players' cursors visible with display names
- Emoji reactions float up from cursor position

---

## Future Features (Not in MVP)

- AI image generation for puzzle images
- Additional tile types
- Time tracking and leaderboards
- In-game text chat
- Spectator mode
- Puzzle difficulty ratings
