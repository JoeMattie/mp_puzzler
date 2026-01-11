// packages/server/src/services/snap.ts
import type { Stencil } from '@mp-puzzler/shared';
import { prisma } from '../lib/prisma.js';

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

  const stencil = game.puzzle.stencilData as unknown as Stencil;
  const piece = stencil.pieces[pieceIndex];
  const pieceWidth = piece.bounds.w;
  const threshold = pieceWidth * POSITION_THRESHOLD;

  // Normalize rotation
  rotation = normalizeRotation(rotation);

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
