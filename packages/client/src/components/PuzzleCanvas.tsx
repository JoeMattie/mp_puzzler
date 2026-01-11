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
