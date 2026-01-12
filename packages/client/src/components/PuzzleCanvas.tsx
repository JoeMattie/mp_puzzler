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
    const game = new Game();
    gameRef.current = game;
    let cancelled = false;

    async function init() {
      await game.init(canvas);
      if (cancelled) return;

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
        onPieceRotate: (pieceIndex, rotation) => {
          socket.emit('piece:rotate', { pieceIndex, rotation });
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

      // Handle cursor presence events
      socket.on('player:joined', ({ id, displayName }) => {
        game.addCursor(id, displayName);
      });

      socket.on('player:left', ({ playerId }) => {
        game.removeCursor(playerId);
      });

      socket.on('cursor:moved', ({ playerId, displayName, x, y }) => {
        if (!game.cursors.has(playerId)) {
          game.addCursor(playerId, displayName);
        }
        game.updateCursor(playerId, x, y);
      });

      // Broadcast local cursor position in board space
      canvas.addEventListener('pointermove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Convert to board space (returns null if in tray)
        const boardPos = game.getLocalCursorBoardPosition(screenX, screenY);
        if (boardPos) {
          socket.emit('cursor:move', { x: boardPos.x, y: boardPos.y });
        }
      });
    }

    init();

    return () => {
      cancelled = true;
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
