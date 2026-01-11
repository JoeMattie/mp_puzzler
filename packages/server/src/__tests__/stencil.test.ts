// packages/server/src/__tests__/stencil.test.ts
import { describe, it, expect } from 'vitest';
import { generateClassicStencil } from '../services/stencil/index.js';

describe('Stencil generator', () => {
  describe('generateClassicStencil', () => {
    it('should generate correct number of pieces', () => {
      const stencil = generateClassicStencil({
        imageWidth: 800,
        imageHeight: 600,
        pieceCount: 200,
      });

      // Piece count is approximate due to aspect ratio fitting
      expect(stencil.pieces.length).toBeGreaterThanOrEqual(180);
      expect(stencil.pieces.length).toBeLessThanOrEqual(220);
    });

    it('should generate pieces with valid paths', () => {
      const stencil = generateClassicStencil({
        imageWidth: 800,
        imageHeight: 600,
        pieceCount: 200,
      });

      for (const piece of stencil.pieces) {
        expect(piece.path).toMatch(/^M /);
        expect(piece.bounds).toHaveProperty('x');
        expect(piece.bounds).toHaveProperty('y');
        expect(piece.bounds).toHaveProperty('w');
        expect(piece.bounds).toHaveProperty('h');
      }
    });

    it('should generate edges between adjacent pieces', () => {
      const stencil = generateClassicStencil({
        imageWidth: 800,
        imageHeight: 600,
        pieceCount: 200,
      });

      expect(stencil.edges.length).toBeGreaterThan(0);

      for (const edge of stencil.edges) {
        expect(edge.pieces).toHaveLength(2);
        expect(edge.id).toMatch(/^\d+-\d+$/);
      }
    });
  });
});
