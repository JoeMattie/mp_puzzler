// packages/server/src/services/games.ts
import { nanoid } from 'nanoid';
import { generateClassicStencil } from './stencil/index.js';
import type { CreateGameInput, Stencil } from '@mp-puzzler/shared';
import { prisma } from '../lib/prisma.js';
import { getGamePlayerCount } from '../socket/handlers.js';

export async function createGame(input: CreateGameInput, sessionId: string) {
  const image = await prisma.image.findUnique({ where: { id: input.imageId } });
  if (!image) throw new Error('Image not found');

  // Generate stencil
  let stencilData: Stencil;
  if (input.tileType === 'classic') {
    stencilData = generateClassicStencil({
      imageWidth: image.width,
      imageHeight: image.height,
      pieceCount: input.pieceCount,
    });
  } else {
    // Pentagon types - placeholder for now
    throw new Error('Pentagon tiles not yet implemented');
  }

  // Create puzzle
  const puzzle = await prisma.puzzle.create({
    data: {
      imageId: input.imageId,
      pieceCount: stencilData.pieces.length,
      tileType: input.tileType,
      stencilData: stencilData as any,
      createdById: sessionId,
    },
  });

  // Create game with unique slug
  const urlSlug = nanoid(8);
  const game = await prisma.game.create({
    data: {
      urlSlug,
      puzzleId: puzzle.id,
    },
  });

  // Initialize piece states (randomized in panel)
  const shuffledIndices = shuffle([...Array(stencilData.pieces.length).keys()]);
  await prisma.pieceState.createMany({
    data: shuffledIndices.map((pieceIndex, panelOrder) => ({
      gameId: game.id,
      pieceIndex,
      x: 0,
      y: 0,
      rotation: Math.random() * Math.PI * 2,
      inPanel: true,
      panelOrder,
    })),
  });

  // Initialize edge states
  await prisma.edgeState.createMany({
    data: stencilData.edges.map((edge) => ({
      gameId: game.id,
      pieceA: edge.pieces[0],
      pieceB: edge.pieces[1],
      solved: false,
    })),
  });

  return {
    id: game.id,
    urlSlug: game.urlSlug,
    pieceCount: puzzle.pieceCount,
    tileType: puzzle.tileType,
    imageUrl: image.url,
  };
}

export async function getGameBySlug(slug: string, sessionId?: string) {
  const game = await prisma.game.findUnique({
    where: { urlSlug: slug },
    include: {
      puzzle: {
        include: { image: true },
      },
    },
  });

  if (!game) return null;

  // Check if this session is admin
  const isAdmin = game.adminSessionId === sessionId;

  // If no admin yet and we have a session, claim admin
  if (!game.adminSessionId && sessionId) {
    await prisma.game.update({
      where: { id: game.id },
      data: { adminSessionId: sessionId },
    });
  }

  return {
    id: game.id,
    urlSlug: game.urlSlug,
    pieceCount: game.puzzle.pieceCount,
    tileType: game.puzzle.tileType,
    imageUrl: game.puzzle.image.url,
    imageWidth: game.puzzle.image.width,
    imageHeight: game.puzzle.image.height,
    status: game.status,
    isAdmin: isAdmin || !game.adminSessionId,
  };
}

export async function getGameStencil(slug: string) {
  const game = await prisma.game.findUnique({
    where: { urlSlug: slug },
    include: { puzzle: true },
  });

  if (!game) return null;
  return game.puzzle.stencilData as unknown as Stencil;
}

export async function getGameState(slug: string) {
  const game = await prisma.game.findUnique({
    where: { urlSlug: slug },
    include: {
      pieceStates: true,
      edgeStates: { where: { solved: true } },
    },
  });

  if (!game) return null;

  const solvedEdges = game.edgeStates.map((e) => `${e.pieceA}-${e.pieceB}`);
  const totalEdges = game.edgeStates.length + (await prisma.edgeState.count({ where: { gameId: game.id, solved: false } }));

  return {
    pieces: game.pieceStates.map((p) => ({
      index: p.pieceIndex,
      x: p.x,
      y: p.y,
      rotation: p.rotation,
      inPanel: p.inPanel,
      panelOrder: p.panelOrder,
      lockGroup: p.lockGroup,
    })),
    solvedEdges,
    progress: solvedEdges.length / totalEdges,
    playerCount: 0, // Will be updated via Socket.IO
  };
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function listGames() {
  const games = await prisma.game.findMany({
    where: { status: 'active' },
    include: {
      puzzle: {
        include: { image: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return games.map((game) => ({
    id: game.id,
    urlSlug: game.urlSlug,
    pieceCount: game.puzzle.pieceCount,
    imageName: game.puzzle.image.name,
    imageUrl: game.puzzle.image.url,
    createdAt: game.createdAt.toISOString(),
    playerCount: getGamePlayerCount(game.id),
  }));
}

export async function deleteGame(slug: string): Promise<{ success: boolean; error?: string }> {
  const game = await prisma.game.findUnique({
    where: { urlSlug: slug },
  });

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  // Check if players are connected
  const playerCount = getGamePlayerCount(game.id);
  if (playerCount > 0) {
    return { success: false, error: 'Cannot delete game while players are connected' };
  }

  // Delete in order: EdgeState, PieceState, Game, then Puzzle
  await prisma.edgeState.deleteMany({ where: { gameId: game.id } });
  await prisma.pieceState.deleteMany({ where: { gameId: game.id } });
  await prisma.game.delete({ where: { id: game.id } });
  await prisma.puzzle.delete({ where: { id: game.puzzleId } });

  return { success: true };
}
