// packages/server/src/services/stencil/classic.ts
import { Stencil, Piece, Edge } from '@mp-puzzler/shared';
import { generateTabPath, generateFlatPath, Point } from './bezier.js';

interface GenerateOptions {
  imageWidth: number;
  imageHeight: number;
  pieceCount: number;
}

export function generateClassicStencil(options: GenerateOptions): Stencil {
  const { imageWidth, imageHeight, pieceCount } = options;

  // Calculate grid dimensions based on aspect ratio
  const aspectRatio = imageWidth / imageHeight;
  const rows = Math.round(Math.sqrt(pieceCount / aspectRatio));
  const cols = Math.round(rows * aspectRatio);

  const pieceWidth = imageWidth / cols;
  const pieceHeight = imageHeight / rows;

  const pieces: Piece[] = [];
  const edges: Edge[] = [];
  const tabDirections: Map<string, boolean> = new Map();

  // Generate pieces
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const x = col * pieceWidth;
      const y = row * pieceHeight;

      // Determine tab directions for each edge
      const topEdge = row === 0 ? 'flat' : getEdgeKey(index, index - cols);
      const rightEdge = col === cols - 1 ? 'flat' : getEdgeKey(index, index + 1);
      const bottomEdge = row === rows - 1 ? 'flat' : getEdgeKey(index, index + cols);
      const leftEdge = col === 0 ? 'flat' : getEdgeKey(index, index - 1);

      // Generate random tab directions for new edges
      if (rightEdge !== 'flat' && !tabDirections.has(rightEdge)) {
        tabDirections.set(rightEdge, Math.random() > 0.5);
      }
      if (bottomEdge !== 'flat' && !tabDirections.has(bottomEdge)) {
        tabDirections.set(bottomEdge, Math.random() > 0.5);
      }

      // Build piece path
      const corners: Point[] = [
        { x, y },
        { x: x + pieceWidth, y },
        { x: x + pieceWidth, y: y + pieceHeight },
        { x, y: y + pieceHeight },
      ];

      const path = buildPiecePath(
        corners,
        { top: topEdge, right: rightEdge, bottom: bottomEdge, left: leftEdge },
        tabDirections,
        index
      );

      // Track edges
      const pieceEdges: { neighborIndex: number; edgeId: string }[] = [];

      if (row > 0) {
        const edgeId = `${index - cols}-${index}`;
        pieceEdges.push({ neighborIndex: index - cols, edgeId });
        if (!edges.find(e => e.id === edgeId)) {
          edges.push({ id: edgeId, pieces: [index - cols, index], type: 'tab-blank' });
        }
      }
      if (col < cols - 1) {
        const edgeId = `${index}-${index + 1}`;
        pieceEdges.push({ neighborIndex: index + 1, edgeId });
        edges.push({ id: edgeId, pieces: [index, index + 1], type: 'tab-blank' });
      }
      if (row < rows - 1) {
        const edgeId = `${index}-${index + cols}`;
        pieceEdges.push({ neighborIndex: index + cols, edgeId });
        edges.push({ id: edgeId, pieces: [index, index + cols], type: 'tab-blank' });
      }
      if (col > 0) {
        const edgeId = `${index - 1}-${index}`;
        pieceEdges.push({ neighborIndex: index - 1, edgeId });
      }

      pieces.push({
        index,
        path,
        bounds: {
          // Padding must exceed tab extension (2*tabRadius + neckWidth = 2*12% + 6% = 30%)
          x: x - pieceWidth * 0.35,
          y: y - pieceHeight * 0.35,
          w: pieceWidth * 1.70,
          h: pieceHeight * 1.70,
        },
        centroid: { x: x + pieceWidth / 2, y: y + pieceHeight / 2 },
        correctPosition: { x, y },
        correctRotation: 0,
        edges: pieceEdges,
      });
    }
  }

  return {
    pieces,
    edges,
    imageWidth,
    imageHeight,
  };
}

function getEdgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function buildPiecePath(
  corners: Point[],
  edgeTypes: { top: string; right: string; bottom: string; left: string },
  tabDirections: Map<string, boolean>,
  seed: number
): string {
  const parts: string[] = [`M ${corners[0].x.toFixed(2)} ${corners[0].y.toFixed(2)}`];

  // Top edge
  if (edgeTypes.top === 'flat') {
    parts.push(generateFlatPath(corners[0], corners[1]));
  } else {
    const isTab = tabDirections.get(edgeTypes.top) ?? false;
    parts.push(generateTabPath(corners[0], corners[1], !isTab, seed * 4));
  }

  // Right edge
  if (edgeTypes.right === 'flat') {
    parts.push(generateFlatPath(corners[1], corners[2]));
  } else {
    const isTab = tabDirections.get(edgeTypes.right) ?? false;
    parts.push(generateTabPath(corners[1], corners[2], isTab, seed * 4 + 1));
  }

  // Bottom edge
  if (edgeTypes.bottom === 'flat') {
    parts.push(generateFlatPath(corners[2], corners[3]));
  } else {
    const isTab = tabDirections.get(edgeTypes.bottom) ?? false;
    parts.push(generateTabPath(corners[2], corners[3], isTab, seed * 4 + 2));
  }

  // Left edge
  if (edgeTypes.left === 'flat') {
    parts.push(generateFlatPath(corners[3], corners[0]));
  } else {
    const isTab = tabDirections.get(edgeTypes.left) ?? false;
    parts.push(generateTabPath(corners[3], corners[0], !isTab, seed * 4 + 3));
  }

  parts.push('Z');
  return parts.join(' ');
}
