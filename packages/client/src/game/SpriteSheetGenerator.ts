// packages/client/src/game/SpriteSheetGenerator.ts
import type { Stencil } from '@mp-puzzler/shared';

export interface SpriteFrame {
  pieceIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GeneratedSpriteSheet {
  canvas: HTMLCanvasElement;
  frames: SpriteFrame[];
}

export async function generateSpriteSheet(
  imageUrl: string,
  stencil: Stencil
): Promise<GeneratedSpriteSheet> {
  // Load image
  const image = await loadImage(imageUrl);

  // Calculate sprite sheet dimensions (simple row packing for now)
  const padding = 2;
  const maxWidth = 4096;
  let currentX = 0;
  let currentY = 0;
  let rowHeight = 0;
  let sheetWidth = 0;
  let sheetHeight = 0;

  const frames: SpriteFrame[] = [];

  // First pass: calculate positions
  for (const piece of stencil.pieces) {
    const width = Math.ceil(piece.bounds.w) + padding * 2;
    const height = Math.ceil(piece.bounds.h) + padding * 2;

    if (currentX + width > maxWidth) {
      currentX = 0;
      currentY += rowHeight + padding;
      rowHeight = 0;
    }

    frames.push({
      pieceIndex: piece.index,
      x: currentX,
      y: currentY,
      width: width - padding * 2,
      height: height - padding * 2,
    });

    currentX += width;
    rowHeight = Math.max(rowHeight, height);
    sheetWidth = Math.max(sheetWidth, currentX);
  }
  sheetHeight = currentY + rowHeight;

  // Create sprite sheet canvas
  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;
  const ctx = canvas.getContext('2d')!;

  // Second pass: render pieces
  for (let i = 0; i < stencil.pieces.length; i++) {
    const piece = stencil.pieces[i];
    const frame = frames[i];

    ctx.save();
    ctx.translate(frame.x + padding, frame.y + padding);

    // Create clipping path
    const path = new Path2D(piece.path);
    ctx.translate(-piece.bounds.x, -piece.bounds.y);
    ctx.clip(path);

    // Draw image portion
    ctx.drawImage(image, 0, 0);

    ctx.restore();
  }

  return { canvas, frames };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
