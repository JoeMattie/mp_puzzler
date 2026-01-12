# Tray and Debug Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix tray-related bugs (drop position, rotation, constraints, scaling) and add debug mode for edge highlighting.

**Architecture:** All changes are in the client package, primarily in `Game.ts`. Debug mode uses a global `window.DEBUG` flag toggled by tilde key. Tray improvements involve fixing drop logic and adding dynamic scaling based on piece count.

**Tech Stack:** PixiJS v8, TypeScript, React

---

## Task 1: Debug Mode - Tilde Key Toggle

**Files:**
- Modify: `packages/client/src/game/Game.ts`

**Step 1: Add debug state and keyboard listener**

In `Game.ts`, add a debug state property and keyboard listener in `setupViewportControls()`:

```typescript
// Add near other state properties (around line 40)
private debugMode = false;

// In setupViewportControls(), add keyboard listener:
window.addEventListener('keydown', (e) => {
  if (e.key === '`' || e.key === '~') {
    this.debugMode = !this.debugMode;
    (window as any).DEBUG = this.debugMode;
    console.log('[debug] Debug mode:', this.debugMode ? 'ON' : 'OFF');
  }
});
```

**Step 2: Run build to verify**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add packages/client/src/game/Game.ts
git commit -m "feat: add debug mode toggle with tilde key"
```

---

## Task 2: Debug Mode - Highlight Matching Edges on Hover

**Files:**
- Modify: `packages/client/src/game/Game.ts`

**Step 1: Add method to find pieces with matching edges**

```typescript
// Add method to Game class
private getPiecesWithMatchingEdges(pieceIndex: number): number[] {
  if (!this.stencil) return [];

  const piece = this.stencil.pieces[pieceIndex];
  if (!piece) return [];

  // Get all neighbor indices from this piece's edges
  return piece.edges.map(e => e.neighborIndex).filter(idx => idx !== -1);
}
```

**Step 2: Modify hover handlers to highlight matching pieces in debug mode**

Update the `pointerover` handler in `setupPieceDrag()`:

```typescript
sprite.on('pointerover', () => {
  if (!this.isDragging) {
    sprite.filters = [hoverFilter];

    // Debug mode: highlight pieces with matching edges
    if (this.debugMode) {
      const pieceIndex = (sprite as any).pieceIndex;
      const matchingPieces = this.getPiecesWithMatchingEdges(pieceIndex);
      for (const matchIdx of matchingPieces) {
        const matchSprite = this.pieces.get(matchIdx);
        if (matchSprite && matchSprite !== sprite) {
          matchSprite.filters = [hoverFilter];
        }
      }
    }
  }
});
```

**Step 3: Update pointerout to clear matching highlights**

```typescript
sprite.on('pointerout', () => {
  if (!this.isDragging) {
    sprite.filters = [];

    // Debug mode: clear matching piece highlights
    if (this.debugMode) {
      const pieceIndex = (sprite as any).pieceIndex;
      const matchingPieces = this.getPiecesWithMatchingEdges(pieceIndex);
      for (const matchIdx of matchingPieces) {
        const matchSprite = this.pieces.get(matchIdx);
        if (matchSprite) {
          matchSprite.filters = [];
        }
      }
    }
  }
});
```

**Step 4: Run build to verify**

Run: `pnpm build`
Expected: Build succeeds

**Step 5: Manual test**

1. Start dev server: `pnpm dev`
2. Open a game
3. Press tilde key - should see console log "Debug mode: ON"
4. Hover over a piece - matching edge pieces should highlight

**Step 6: Commit**

```bash
git add packages/client/src/game/Game.ts
git commit -m "feat: highlight matching edge pieces in debug mode"
```

---

## Task 3: Fix Board-to-Tray Drop Position

**Files:**
- Modify: `packages/client/src/game/Game.ts`

**Step 1: Update handleDrop to place piece at cursor position in tray**

Find the `handleDrop` function and modify the board-to-tray logic:

```typescript
// In handleDrop, replace the board->tray section:
if (droppedInTrayZone) {
  // Move to tray (if not already there)
  if (!inTray) {
    this.boardContainer.removeChild(sprite);
    this.trayPiecesContainer.addChild(sprite);
    this.pieceInTray.set(pieceIndex, true);

    // Place at cursor X position in tray, not at end
    const trayLocalPos = this.trayPiecesContainer.toLocal(globalPos);
    sprite.x = trayLocalPos.x;
    sprite.y = 0;

    console.log('[drag] DROP board->tray piece', pieceIndex, {
      globalPos: { x: globalPos.x, y: globalPos.y },
      newTrayPos: { x: sprite.x, y: sprite.y },
    });
  } else {
    console.log('[drag] DROP in tray (stayed) piece', pieceIndex, {
      globalPos: { x: globalPos.x, y: globalPos.y },
      trayPos: { x: sprite.x, y: sprite.y },
    });
  }
}
```

**Step 2: Run build to verify**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Manual test**

1. Drag a piece from board to tray
2. Piece should drop where cursor is, not at end of tray

**Step 4: Commit**

```bash
git add packages/client/src/game/Game.ts
git commit -m "fix: drop pieces at cursor position when moving to tray"
```

---

## Task 4: Fix Tray Piece Rotation

**Files:**
- Modify: `packages/client/src/game/Game.ts`

**Step 1: Investigate current rotation logic**

The rotation logic in `setupViewportControls()` checks `hasPieceAtScreen()` which may not work for tray pieces. Update the mouse move handler to support tray piece rotation:

```typescript
// In the mousemove handler, update the rotation section:
if (this.isRotatingPiece && this.rotatingPiece) {
  const dx = e.movementX;
  this.rotatingPiece.rotation += dx * 0.01;
  const pieceIndex = (this.rotatingPiece as any).pieceIndex;
  this.onPieceRotate?.(pieceIndex, this.rotatingPiece.rotation);
}
```

**Step 2: Fix getPieceAtScreen to check tray pieces**

Modify `getPieceAtScreen` to also check tray pieces:

```typescript
private getPieceAtScreen(screenX: number, screenY: number): Sprite | null {
  // Check tray pieces first if in tray area
  if (this.isInTray(screenY)) {
    const trayPos = this.trayPiecesContainer.toLocal(new Point(screenX, screenY));
    for (const [, sprite] of this.pieces) {
      if (this.pieceInTray.get((sprite as any).pieceIndex)) {
        const localX = trayPos.x - sprite.x;
        const localY = trayPos.y - sprite.y;
        const halfW = sprite.width / 2;
        const halfH = sprite.height / 2;
        if (localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH) {
          return sprite;
        }
      }
    }
    return null;
  }

  // Check board pieces
  const boardPos = this.screenToBoard({ x: screenX, y: screenY });
  for (const [, sprite] of this.pieces) {
    if (!this.pieceInTray.get((sprite as any).pieceIndex)) {
      const localX = boardPos.x - sprite.x;
      const localY = boardPos.y - sprite.y;
      const halfW = sprite.width / 2;
      const halfH = sprite.height / 2;
      if (localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH) {
        return sprite;
      }
    }
  }
  return null;
}
```

**Step 3: Run build to verify**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Manual test**

1. Right-click and drag on a piece in the tray
2. Piece should rotate

**Step 5: Commit**

```bash
git add packages/client/src/game/Game.ts
git commit -m "fix: enable piece rotation in tray"
```

---

## Task 5: Constrain Pieces Within Tray Bounds

**Files:**
- Modify: `packages/client/src/game/Game.ts`

**Step 1: Add tray bounds constraint in globalpointermove**

When dragging within tray, constrain the Y position:

```typescript
// In globalpointermove handler, after updating tray position:
if (this.pieceInTray.get(pieceIndex)) {
  const trayPos = this.trayPiecesContainer.toLocal(new Point(e.global.x, e.global.y));
  sprite.x = trayPos.x - this.dragOffset.x;
  // Constrain Y to stay within tray (centered vertically)
  sprite.y = 0;
}
```

**Step 2: Run build to verify**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add packages/client/src/game/Game.ts
git commit -m "fix: constrain pieces to stay within tray bounds"
```

---

## Task 6: Draw Puzzle Outline on Board

**Files:**
- Modify: `packages/client/src/game/Game.ts`

**Step 1: Add puzzle outline graphics container**

Add a new property and create the outline in loadPuzzle:

```typescript
// Add property near other container properties
private puzzleOutline!: Graphics;

// In setupContainers(), after creating boardContainer:
this.puzzleOutline = new Graphics();
this.boardContainer.addChild(this.puzzleOutline);
```

**Step 2: Draw the outline in loadPuzzle**

```typescript
// In loadPuzzle, after setting up pieces, draw the outline:
private drawPuzzleOutline() {
  if (!this.stencil) return;

  this.puzzleOutline.clear();
  this.puzzleOutline.rect(0, 0, this.stencil.imageWidth, this.stencil.imageHeight);
  this.puzzleOutline.stroke({ color: 0x4fc3f7, alpha: 0.3, width: 2 });
}

// Call it at end of loadPuzzle:
this.drawPuzzleOutline();
```

**Step 3: Run build to verify**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/client/src/game/Game.ts
git commit -m "feat: draw puzzle outline on board"
```

---

## Task 7: Scale Tray Pieces Based on Piece Count

**Files:**
- Modify: `packages/client/src/game/Game.ts`

**Step 1: Calculate tray scale based on piece dimensions**

Add a method to calculate appropriate tray scale:

```typescript
private calculateTrayScale(): number {
  if (!this.stencil || this.stencil.pieces.length === 0) return 1;

  // Find the maximum piece dimensions
  let maxHeight = 0;
  for (const piece of this.stencil.pieces) {
    maxHeight = Math.max(maxHeight, piece.bounds.h);
  }

  // Scale so pieces fit in tray with some padding
  const targetHeight = this.trayHeight - 20; // 10px padding top and bottom
  const scale = Math.min(1, targetHeight / maxHeight);

  return scale;
}
```

**Step 2: Apply scale to tray pieces container**

In `loadPuzzle`, after adding pieces to tray:

```typescript
// After placing initial pieces, set tray scale
const trayScale = this.calculateTrayScale();
this.trayPiecesContainer.scale.set(trayScale);

// Adjust spacing based on scale
this.trayPieceSpacing = 100 * trayScale;
```

**Step 3: Update tray piece positioning to account for scale**

Ensure piece positioning accounts for the scale when dropping pieces in tray.

**Step 4: Run build to verify**

Run: `pnpm build`
Expected: Build succeeds

**Step 5: Manual test**

1. Create puzzles with different piece counts
2. Tray pieces should be appropriately scaled

**Step 6: Commit**

```bash
git add packages/client/src/game/Game.ts
git commit -m "feat: scale tray pieces based on piece count"
```

---

## Task 8: Expand Docker Compose for Dev Servers

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Add frontend and backend services**

```yaml
services:
  db:
    image: postgres:16
    container_name: puzzler-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mp_puzzler
    ports:
      - "5432:5432"
    volumes:
      - puzzler-db-data:/var/lib/postgresql/data

  server:
    build:
      context: .
      dockerfile: Dockerfile.dev
      target: server
    container_name: puzzler-server
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/mp_puzzler
      JWT_SECRET: dev-secret-key
      PORT: 3001
      CLIENT_URL: http://localhost:5173
    depends_on:
      - db
    volumes:
      - ./packages/server:/app/packages/server
      - ./packages/shared:/app/packages/shared
    command: pnpm -F @mp-puzzler/server dev

  client:
    build:
      context: .
      dockerfile: Dockerfile.dev
      target: client
    container_name: puzzler-client
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3001
    volumes:
      - ./packages/client:/app/packages/client
      - ./packages/shared:/app/packages/shared
    command: pnpm -F @mp-puzzler/client dev --host

volumes:
  puzzler-db-data:
```

**Step 2: Create Dockerfile.dev**

```dockerfile
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

FROM base AS server
RUN pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
EXPOSE 3001

FROM base AS client
RUN pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY packages/client ./packages/client
EXPOSE 5173
```

**Step 3: Test docker-compose**

Run: `docker-compose up --build`
Expected: All services start

**Step 4: Commit**

```bash
git add docker-compose.yml Dockerfile.dev
git commit -m "feat: add dev server services to docker-compose"
```

---

## Task 9: Investigate Vite HMR Browser Tab Crash

**Files:**
- Research task

**Step 1: Search for known Vite HMR issues**

Search web for: "Vite HMR crashes browser tab PixiJS WebGL 2024"

**Step 2: Check for WebGL context loss handling**

Common cause is WebGL context loss during HMR. Add context loss handler:

```typescript
// In Game.ts init(), after creating app:
this.app.canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  console.warn('[game] WebGL context lost');
});

this.app.canvas.addEventListener('webglcontextrestored', () => {
  console.log('[game] WebGL context restored');
  // May need to reinitialize textures
});
```

**Step 3: Check Vite config for HMR settings**

In `packages/client/vite.config.ts`, check for HMR configuration that might help.

**Step 4: Document findings and potential fixes**

If a solution is found, implement it. Otherwise, document the issue and workarounds.

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: handle WebGL context loss during HMR"
```

---

## Summary

Tasks in recommended order:
1. Debug mode toggle (foundation)
2. Debug mode edge highlighting (builds on #1)
3. Fix board-to-tray drop position (quick fix)
4. Fix tray piece rotation (quick fix)
5. Constrain tray bounds (quick fix)
6. Draw puzzle outline (visual enhancement)
7. Scale tray pieces (UX improvement)
8. Docker compose expansion (infrastructure)
9. Vite HMR investigation (research/fix)

After each task, run `pnpm build` to verify TypeScript compilation.
