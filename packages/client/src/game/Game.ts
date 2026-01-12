// packages/client/src/game/Game.ts
import { Application, Container, Sprite, Texture, Rectangle, Graphics, Text, TextStyle } from 'pixi.js';
import type { Stencil, GameState } from '@mp-puzzler/shared';
import { generateSpriteSheet, GeneratedSpriteSheet } from './SpriteSheetGenerator';

export class Game {
  private app: Application;
  private surface: Container;
  private panel: Container;
  private pieces: Map<number, Sprite> = new Map();
  private spriteSheet: GeneratedSpriteSheet | null = null;
  private stencil: Stencil | null = null;
  public cursors: Map<string, { sprite: Container; label: Text }> = new Map();

  private isDragging = false;
  private draggedPiece: Sprite | null = null;
  private dragOffset = { x: 0, y: 0 };

  private onPieceGrab?: (pieceIndex: number) => void;
  private onPieceMove?: (pieceIndex: number, x: number, y: number) => void;
  private onPieceDrop?: (pieceIndex: number, x: number, y: number, rotation: number) => void;

  private initialized = false;
  private destroyed = false;

  constructor() {
    this.app = new Application();
    this.surface = new Container();
    this.panel = new Container();
  }

  async init(canvas: HTMLCanvasElement) {
    if (this.destroyed) return;

    await this.app.init({
      canvas,
      resizeTo: canvas.parentElement!,
      backgroundColor: 0x1a1a2e,
      antialias: true,
    });

    if (this.destroyed) return;

    // Setup containers
    this.surface.sortableChildren = true;
    this.app.stage.addChild(this.surface);
    this.app.stage.addChild(this.panel);

    // Setup viewport controls
    this.setupViewportControls();

    this.initialized = true;
  }

  async loadPuzzle(imageUrl: string, stencil: Stencil, state: GameState) {
    this.stencil = stencil;

    // Generate sprite sheet
    this.spriteSheet = await generateSpriteSheet(imageUrl, stencil);
    const baseTexture = Texture.from(this.spriteSheet.canvas);

    // Create sprites for each piece
    for (const frame of this.spriteSheet.frames) {
      const piece = stencil.pieces[frame.pieceIndex];
      const pieceState = state.pieces.find(p => p.index === frame.pieceIndex)!;

      const texture = new Texture({
        source: baseTexture.source,
        frame: new Rectangle(frame.x, frame.y, frame.width, frame.height),
      });

      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.eventMode = 'static';
      sprite.cursor = 'grab';

      // Set position from state
      if (pieceState.inPanel) {
        sprite.x = 100 + (pieceState.panelOrder || 0) * 80;
        sprite.y = this.app.screen.height - 60;
      } else {
        sprite.x = pieceState.x + piece.bounds.w / 2;
        sprite.y = pieceState.y + piece.bounds.h / 2;
      }
      sprite.rotation = pieceState.rotation;

      // Store piece index
      (sprite as any).pieceIndex = frame.pieceIndex;

      // Setup drag handlers
      this.setupPieceDrag(sprite);

      this.pieces.set(frame.pieceIndex, sprite);
      this.surface.addChild(sprite);
    }
  }

  private setupPieceDrag(sprite: Sprite) {
    sprite.on('pointerdown', (e) => {
      if (this.isDragging) return;

      this.isDragging = true;
      this.draggedPiece = sprite;
      sprite.cursor = 'grabbing';
      sprite.zIndex = 1000;

      const pos = e.global;
      this.dragOffset.x = pos.x - sprite.x;
      this.dragOffset.y = pos.y - sprite.y;

      const pieceIndex = (sprite as any).pieceIndex;
      this.onPieceGrab?.(pieceIndex);
    });

    sprite.on('globalpointermove', (e) => {
      if (!this.isDragging || this.draggedPiece !== sprite) return;

      const pos = e.global;
      sprite.x = pos.x - this.dragOffset.x;
      sprite.y = pos.y - this.dragOffset.y;

      const pieceIndex = (sprite as any).pieceIndex;
      this.onPieceMove?.(pieceIndex, sprite.x, sprite.y);
    });

    sprite.on('pointerup', () => {
      if (this.draggedPiece !== sprite) return;

      this.isDragging = false;
      sprite.cursor = 'grab';
      sprite.zIndex = 0;

      const pieceIndex = (sprite as any).pieceIndex;
      this.onPieceDrop?.(pieceIndex, sprite.x, sprite.y, sprite.rotation);

      this.draggedPiece = null;
    });

    sprite.on('pointerupoutside', () => {
      if (this.draggedPiece !== sprite) return;

      this.isDragging = false;
      sprite.cursor = 'grab';
      sprite.zIndex = 0;

      const pieceIndex = (sprite as any).pieceIndex;
      this.onPieceDrop?.(pieceIndex, sprite.x, sprite.y, sprite.rotation);

      this.draggedPiece = null;
    });
  }

  private setupViewportControls() {
    // Zoom with mouse wheel
    this.app.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      if (e.ctrlKey && this.draggedPiece) {
        // Rotate piece
        this.draggedPiece.rotation += e.deltaY * 0.01;
      } else {
        // Zoom viewport
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.surface.scale.x *= scaleFactor;
        this.surface.scale.y *= scaleFactor;
      }
    });
  }

  // Public API for socket events
  setHandlers(handlers: {
    onPieceGrab: (pieceIndex: number) => void;
    onPieceMove: (pieceIndex: number, x: number, y: number) => void;
    onPieceDrop: (pieceIndex: number, x: number, y: number, rotation: number) => void;
  }) {
    this.onPieceGrab = handlers.onPieceGrab;
    this.onPieceMove = handlers.onPieceMove;
    this.onPieceDrop = handlers.onPieceDrop;
  }

  updatePiecePosition(pieceIndex: number, x: number, y: number) {
    const sprite = this.pieces.get(pieceIndex);
    if (sprite && sprite !== this.draggedPiece) {
      sprite.x = x;
      sprite.y = y;
    }
  }

  updatePieceRotation(pieceIndex: number, rotation: number) {
    const sprite = this.pieces.get(pieceIndex);
    if (sprite && sprite !== this.draggedPiece) {
      sprite.rotation = rotation;
    }
  }

  // Cursor presence methods
  addCursor(playerId: string, displayName: string) {
    if (this.cursors.has(playerId)) return;

    // Use Container to hold both cursor dot and label (Graphics can't have children in v8)
    const cursorContainer = new Container();
    cursorContainer.visible = false;

    const cursorDot = new Graphics();
    cursorDot.circle(0, 0, 8);
    cursorDot.fill({ color: 0x4fc3f7, alpha: 0.8 });

    const label = new Text({
      text: displayName,
      style: new TextStyle({
        fontSize: 12,
        fill: 0xffffff,
        fontFamily: 'sans-serif',
      }),
    });
    label.y = 12;
    label.anchor.set(0.5, 0);

    cursorContainer.addChild(cursorDot);
    cursorContainer.addChild(label);

    this.surface.addChild(cursorContainer);
    this.cursors.set(playerId, { sprite: cursorContainer, label });
  }

  updateCursor(playerId: string, x: number, y: number) {
    const cursor = this.cursors.get(playerId);
    if (!cursor) return;

    cursor.sprite.x = x;
    cursor.sprite.y = y;
    cursor.sprite.visible = true;
  }

  removeCursor(playerId: string) {
    const cursor = this.cursors.get(playerId);
    if (!cursor) return;

    this.surface.removeChild(cursor.sprite);
    this.cursors.delete(playerId);
  }

  destroy() {
    this.destroyed = true;
    // Only destroy if fully initialized to avoid race conditions
    if (this.initialized && this.app.stage) {
      this.app.destroy(true);
    }
  }
}
