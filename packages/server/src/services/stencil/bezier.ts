// packages/server/src/services/stencil/bezier.ts

export interface Point {
  x: number;
  y: number;
}

export function generateTabPath(
  start: Point,
  end: Point,
  isTab: boolean,
  _seed: number
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Normalize direction (along the edge)
  const nx = dx / length;
  const ny = dy / length;

  // Perpendicular direction (pointing "outward" for tab)
  const px = -ny;
  const py = nx;

  // Fixed tab parameters for consistent round shape
  const tabRadius = length * 0.12;
  const neckWidth = length * 0.06;

  const direction = isTab ? 1 : -1;

  // Neck start/end points (where the tab connects to the edge)
  const neckStart = { x: start.x + dx * 0.4, y: start.y + dy * 0.4 };
  const neckEnd = { x: start.x + dx * 0.6, y: start.y + dy * 0.6 };

  // Points at the neck opening (slightly out from edge)
  const neckOpenLeft = {
    x: neckStart.x + px * neckWidth * direction,
    y: neckStart.y + py * neckWidth * direction,
  };
  const neckOpenRight = {
    x: neckEnd.x + px * neckWidth * direction,
    y: neckEnd.y + py * neckWidth * direction,
  };

  // Tab center and key points on the circle
  const tabCenter = {
    x: start.x + dx * 0.5 + px * (tabRadius + neckWidth) * direction,
    y: start.y + dy * 0.5 + py * (tabRadius + neckWidth) * direction,
  };

  // Points on the circle (left, tip, right)
  const circleLeft = {
    x: tabCenter.x - nx * tabRadius,
    y: tabCenter.y - ny * tabRadius,
  };
  const circleTip = {
    x: tabCenter.x + px * tabRadius * direction,
    y: tabCenter.y + py * tabRadius * direction,
  };
  const circleRight = {
    x: tabCenter.x + nx * tabRadius,
    y: tabCenter.y + ny * tabRadius,
  };

  // Control point distance for bezier circle approximation
  const cp = tabRadius * 0.55;

  return [
    `L ${neckStart.x.toFixed(2)} ${neckStart.y.toFixed(2)}`,
    // Line to neck opening
    `L ${neckOpenLeft.x.toFixed(2)} ${neckOpenLeft.y.toFixed(2)}`,
    // Line to left side of circle
    `L ${circleLeft.x.toFixed(2)} ${circleLeft.y.toFixed(2)}`,
    // Bezier curve from left to tip (quarter circle)
    `C ${(circleLeft.x + px * cp * direction).toFixed(2)} ${(circleLeft.y + py * cp * direction).toFixed(2)}`,
    `${(circleTip.x - nx * cp).toFixed(2)} ${(circleTip.y - ny * cp).toFixed(2)}`,
    `${circleTip.x.toFixed(2)} ${circleTip.y.toFixed(2)}`,
    // Bezier curve from tip to right (quarter circle)
    `C ${(circleTip.x + nx * cp).toFixed(2)} ${(circleTip.y + ny * cp).toFixed(2)}`,
    `${(circleRight.x + px * cp * direction).toFixed(2)} ${(circleRight.y + py * cp * direction).toFixed(2)}`,
    `${circleRight.x.toFixed(2)} ${circleRight.y.toFixed(2)}`,
    // Line to neck opening right
    `L ${neckOpenRight.x.toFixed(2)} ${neckOpenRight.y.toFixed(2)}`,
    // Line back to edge
    `L ${neckEnd.x.toFixed(2)} ${neckEnd.y.toFixed(2)}`,
    `L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
  ].join(' ');
}

export function generateFlatPath(start: Point, end: Point): string {
  return `L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}
