// packages/server/src/socket/handlers.ts
import { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@mp-puzzler/shared';
import { getSessionFromToken } from '../services/auth.js';
import { checkSnap } from '../services/snap.js';
import { prisma } from '../lib/prisma.js';

// Track piece ownership: gameId -> pieceIndex -> sessionId
const pieceOwners = new Map<string, Map<number, string>>();

// Track connected players: gameId -> Set<sessionId>
const gamePlayers = new Map<string, Set<string>>();

// Export function to get player count for a game
export function getGamePlayerCount(gameId: string): number {
  return gamePlayers.get(gameId)?.size ?? 0;
}

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
