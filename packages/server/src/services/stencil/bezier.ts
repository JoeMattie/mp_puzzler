// packages/server/src/services/stencil/bezier.ts

export interface Point {
  x: number;
  y: number;
}

export function generateTabPath(
  start: Point,
  end: Point,
  isTab: boolean,
  seed: number
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Normalize direction
  const nx = dx / length;
  const ny = dy / length;

  // Perpendicular direction
  const px = -ny;
  const py = nx;

  // Tab parameters with slight randomization
  const tabHeight = length * 0.25 * (0.9 + seededRandom(seed) * 0.2);
  const tabWidth = length * 0.35 * (0.9 + seededRandom(seed + 1) * 0.2);
  const neckWidth = length * 0.15 * (0.9 + seededRandom(seed + 2) * 0.2);

  const direction = isTab ? 1 : -1;

  // Key points along the edge
  const p1 = { x: start.x + dx * 0.35, y: start.y + dy * 0.35 };
  const p2 = { x: start.x + dx * 0.4, y: start.y + dy * 0.4 };
  const p3 = {
    x: start.x + dx * 0.5 + px * tabHeight * direction,
    y: start.y + dy * 0.5 + py * tabHeight * direction,
  };
  const p4 = { x: start.x + dx * 0.6, y: start.y + dy * 0.6 };
  const p5 = { x: start.x + dx * 0.65, y: start.y + dy * 0.65 };

  // Control points for bezier curves
  return [
    `L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `C ${p1.x + px * neckWidth * direction} ${p1.y + py * neckWidth * direction}`,
    `${p2.x + px * tabHeight * direction - nx * tabWidth} ${p2.y + py * tabHeight * direction - ny * tabWidth}`,
    `${p3.x - nx * tabWidth * 0.3} ${p3.y - ny * tabWidth * 0.3}`,
    `C ${p3.x + nx * tabWidth * 0.3} ${p3.y + ny * tabWidth * 0.3}`,
    `${p4.x + px * tabHeight * direction + nx * tabWidth} ${p4.y + py * tabHeight * direction + ny * tabWidth}`,
    `${p5.x + px * neckWidth * direction} ${p5.y + py * neckWidth * direction}`,
    `L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
  ].join(' ');
}

export function generateFlatPath(start: Point, end: Point): string {
  return `L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}
