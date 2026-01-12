// packages/client/src/game/Game.ts
import { Application, Container, Sprite, Texture, Rectangle, Graphics, Text, TextStyle, ColorMatrixFilter, Point } from 'pixi.js';
import type { Stencil, GameState } from '@mp-puzzler/shared';
import { generateSpriteSheet, GeneratedSpriteSheet } from './SpriteSheetGenerator';
import { InputManager } from './InputManager';

interface BoardTransform {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export class Game {
  private app!: Application;

  // Container hierarchy
  private boardContainer!: Container;
  private trayContainer!: Container;
  private trayBackground!: Graphics;
  private trayPiecesContainer!: Container;

  // State
  private pieces: Map<number, Sprite> = new Map();
  private pieceInTray: Map<number, boolean> = new Map();
  private spriteSheet: GeneratedSpriteSheet | null = null;
  private stencil: Stencil | null = null;
  public cursors: Map<string, { sprite: Container; label: Text }> = new Map();

  // Board transform state
  private boardTransform: BoardTransform = { x: 0, y: 0, rotation: 0, scale: 1 };

  // Tray state
  private trayHeight = 120;
  private trayScrollX = 0;
  private trayPieceSpacing = 100;
  private trayPiecePadding = 60;

  // Drag state
  private isDragging = false;
  private draggedPiece: Sprite | null = null;
  private dragOffset = { x: 0, y: 0 };
  private dragStartedInTray = false;

  // Debug state
  private debugMode = false;

  // Rotation state
  private isRotatingPiece = false;
  private rotatingPiece: Sprite | null = null;
  private rotationStartX = 0;
  private rotationStartAngle = 0;

  // Board interaction state
  private isPanning = false;
  private isRotatingBoard = false;
  private panStart = { x: 0, y: 0 };
  private boardTransformStart: BoardTransform = { x: 0, y: 0, rotation: 0, scale: 1 };

  // Input manager
  private inputManager!: InputManager;

  // Event handlers
  private onPieceGrab?: (pieceIndex: number) => void;
  private onPieceMove?: (pieceIndex: number, x: number, y: number) => void;
  private onPieceDrop?: (pieceIndex: number, x: number, y: number, rotation: number) => void;
  private onPieceRotate?: (pieceIndex: number, rotation: number) => void;

  // Lifecycle
  private initialized = false;
  private destroyed = false;

  constructor() {
    this.app = new Application();
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

    // Create container hierarchy
    this.setupContainers();

    // Setup input manager
    this.inputManager = new InputManager(canvas, this);

    // Setup viewport controls
    this.setupViewportControls();

    // Handle window resize
    window.addEventListener('resize', this.handleResize);

    this.initialized = true;
  }

  private setupContainers() {
    // Board container - transforms applied here
    this.boardContainer = new Container();
    this.boardContainer.sortableChildren = true;
    this.app.stage.addChild(this.boardContainer);

    // Tray container - fixed to bottom
    this.trayContainer = new Container();
    this.app.stage.addChild(this.trayContainer);

    // Tray background
    this.trayBackground = new Graphics();
    this.trayContainer.addChild(this.trayBackground);

    // Tray pieces container (for scrolling)
    this.trayPiecesContainer = new Container();
    this.trayContainer.addChild(this.trayPiecesContainer);

    // Initial tray render
    this.renderTrayBackground();
  }

  private renderTrayBackground() {
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    this.trayBackground.clear();

    // Semi-transparent dark background
    this.trayBackground.rect(0, height - this.trayHeight, width, this.trayHeight);
    this.trayBackground.fill({ color: 0x0d0d1a, alpha: 0.9 });

    // Top border
    this.trayBackground.rect(0, height - this.trayHeight, width, 2);
    this.trayBackground.fill({ color: 0x4fc3f7, alpha: 0.5 });

    // Position tray pieces container
    this.trayPiecesContainer.y = height - this.trayHeight / 2;
  }

  private handleResize = () => {
    this.renderTrayBackground();
    this.updateTrayPiecePositions();
  };

  // Coordinate conversion: screen/global space -> board container local space
  screenToBoard(point: { x: number; y: number }): Point {
    return this.boardContainer.toLocal(new Point(point.x, point.y));
  }

  // Coordinate conversion: board container local space -> screen/global space
  boardToScreen(point: { x: number; y: number }): Point {
    return this.boardContainer.toGlobal(new Point(point.x, point.y));
  }

  // Apply board transform to container
  private applyBoardTransform() {
    this.boardContainer.x = this.boardTransform.x;
    this.boardContainer.y = this.boardTransform.y;
    this.boardContainer.rotation = this.boardTransform.rotation;
    this.boardContainer.scale.set(this.boardTransform.scale);
  }

  // Check if point is in tray area
  isInTray(screenY: number): boolean {
    return screenY > this.app.screen.height - this.trayHeight;
  }

  // Get tray bounds
  getTrayBounds() {
    return {
      y: this.app.screen.height - this.trayHeight,
      height: this.trayHeight,
    };
  }

  async loadPuzzle(imageUrl: string, stencil: Stencil, state: GameState) {
    this.stencil = stencil;

    // Generate sprite sheet
    this.spriteSheet = await generateSpriteSheet(imageUrl, stencil);
    const baseTexture = Texture.from(this.spriteSheet.canvas);

    // Create sprites for each piece
    for (const frame of this.spriteSheet.frames) {
      const piece = stencil.pieces[frame.pieceIndex];
      const pieceState = state.pieces.find((p) => p.index === frame.pieceIndex)!;

      const texture = new Texture({
        source: baseTexture.source,
        frame: new Rectangle(frame.x, frame.y, frame.width, frame.height),
      });

      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.eventMode = 'static';
      sprite.cursor = 'grab';

      // Store piece index
      (sprite as any).pieceIndex = frame.pieceIndex;

      // Setup drag handlers
      this.setupPieceDrag(sprite);

      this.pieces.set(frame.pieceIndex, sprite);

      // Position and add to correct container
      if (pieceState.inPanel) {
        this.pieceInTray.set(frame.pieceIndex, true);
        sprite.x = this.trayPiecePadding + (pieceState.panelOrder || 0) * this.trayPieceSpacing;
        sprite.y = 0; // Relative to trayPiecesContainer
        sprite.rotation = pieceState.rotation;
        this.trayPiecesContainer.addChild(sprite);
      } else {
        this.pieceInTray.set(frame.pieceIndex, false);
        sprite.x = pieceState.x + piece.bounds.w / 2;
        sprite.y = pieceState.y + piece.bounds.h / 2;
        sprite.rotation = pieceState.rotation;
        this.boardContainer.addChild(sprite);
      }
    }

    // Center board initially
    this.centerBoard();
  }

  private centerBoard() {
    if (!this.stencil) return;

    const boardWidth = this.stencil.imageWidth;
    const boardHeight = this.stencil.imageHeight;
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height - this.trayHeight;

    // Calculate scale to fit
    const scaleX = screenWidth / boardWidth;
    const scaleY = screenHeight / boardHeight;
    const scale = Math.min(scaleX, scaleY) * 0.8;

    this.boardTransform.scale = scale;
    this.boardTransform.x = screenWidth / 2;
    this.boardTransform.y = screenHeight / 2;
    this.boardTransform.rotation = 0;

    // Offset to center the puzzle (pieces are positioned from top-left)
    this.boardTransform.x -= (boardWidth * scale) / 2;
    this.boardTransform.y -= (boardHeight * scale) / 2;

    this.applyBoardTransform();
  }

  private updateTrayPiecePositions() {
    // Apply scroll offset
    this.trayPiecesContainer.x = -this.trayScrollX;
  }

  private setupPieceDrag(sprite: Sprite) {
    // Hover highlight
    const hoverFilter = new ColorMatrixFilter();
    hoverFilter.brightness(1.2, false);

    sprite.on('pointerover', () => {
      if (!this.isDragging) {
        sprite.filters = [hoverFilter];
      }
    });

    sprite.on('pointerout', () => {
      if (!this.isDragging) {
        sprite.filters = [];
      }
    });

    sprite.on('pointerdown', (e) => {
      // Only handle left click for drag
      if (e.button !== 0) return;
      if (this.isDragging) return;

      const pieceIndex = (sprite as any).pieceIndex;
      const inTray = this.pieceInTray.get(pieceIndex);

      this.isDragging = true;
      this.draggedPiece = sprite;
      this.dragStartedInTray = inTray || false;
      sprite.cursor = 'grabbing';
      sprite.zIndex = 1000;

      // Calculate drag offset in the piece's current container space
      const container = inTray ? this.trayPiecesContainer : this.boardContainer;
      const localPos = e.getLocalPosition(container);
      this.dragOffset.x = localPos.x - sprite.x;
      this.dragOffset.y = localPos.y - sprite.y;

      console.log('[drag] GRAB piece', pieceIndex, {
        container: inTray ? 'tray' : 'board',
        spritePos: { x: sprite.x, y: sprite.y },
        cursorLocal: { x: localPos.x, y: localPos.y },
        dragOffset: { ...this.dragOffset },
      });

      this.onPieceGrab?.(pieceIndex);
    });

    sprite.on('globalpointermove', (e) => {
      if (!this.isDragging || this.draggedPiece !== sprite) return;

      const pieceIndex = (sprite as any).pieceIndex;
      const inTray = this.pieceInTray.get(pieceIndex);
      const cursorInTray = this.isInTray(e.global.y);

      // If piece is in tray and cursor moves out, transfer to board
      if (inTray && !cursorInTray) {
        this.trayPiecesContainer.removeChild(sprite);
        this.boardContainer.addChild(sprite);
        this.pieceInTray.set(pieceIndex, false);

        // Place piece at cursor position in board space
        const boardPos = e.getLocalPosition(this.boardContainer);
        sprite.x = boardPos.x;
        sprite.y = boardPos.y;

        // Reset drag offset since piece is now at cursor
        this.dragOffset.x = 0;
        this.dragOffset.y = 0;

        console.log('[drag] TRANSFER tray->board piece', pieceIndex, {
          cursorGlobal: { x: e.global.x, y: e.global.y },
          newBoardPos: { x: sprite.x, y: sprite.y },
        });
      }

      // Update position in the appropriate container space
      const currentInTray = this.pieceInTray.get(pieceIndex);
      const container = currentInTray ? this.trayPiecesContainer : this.boardContainer;
      const localPos = e.getLocalPosition(container);
      sprite.x = localPos.x - this.dragOffset.x;
      sprite.y = localPos.y - this.dragOffset.y;

      this.onPieceMove?.(pieceIndex, sprite.x, sprite.y);
    });

    const handleDrop = () => {
      if (this.draggedPiece !== sprite) return;

      const pieceIndex = (sprite as any).pieceIndex;
      const inTray = this.pieceInTray.get(pieceIndex);

      this.isDragging = false;
      sprite.cursor = 'grab';
      sprite.zIndex = 0;
      sprite.filters = [];

      // Check if dropped in tray zone
      const globalPos = sprite.getGlobalPosition();
      const droppedInTrayZone = this.isInTray(globalPos.y);

      if (droppedInTrayZone) {
        // Move to tray (if not already there)
        if (!inTray) {
          this.boardContainer.removeChild(sprite);
          this.trayPiecesContainer.addChild(sprite);
          this.pieceInTray.set(pieceIndex, true);

          // Assign panel order (add to end) - only for newly added pieces
          const trayPieceCount = Array.from(this.pieceInTray.values()).filter((v) => v).length;
          sprite.x = this.trayPiecePadding + (trayPieceCount - 1) * this.trayPieceSpacing;
          sprite.y = 0;

          console.log('[drag] DROP board->tray piece', pieceIndex, {
            globalPos: { x: globalPos.x, y: globalPos.y },
            newTrayPos: { x: sprite.x, y: sprite.y },
            trayPieceCount,
          });
        } else {
          console.log('[drag] DROP in tray (stayed) piece', pieceIndex, {
            globalPos: { x: globalPos.x, y: globalPos.y },
            trayPos: { x: sprite.x, y: sprite.y },
          });
        }
      } else {
        console.log('[drag] DROP on board piece', pieceIndex, {
          globalPos: { x: globalPos.x, y: globalPos.y },
          boardPos: { x: sprite.x, y: sprite.y },
        });
      }

      this.onPieceDrop?.(pieceIndex, sprite.x, sprite.y, sprite.rotation);
      this.draggedPiece = null;
      this.dragStartedInTray = false;
    };

    sprite.on('pointerup', handleDrop);
    sprite.on('pointerupoutside', handleDrop);
  }

  private setupViewportControls() {
    const canvas = this.app.canvas;

    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard listener for debug mode toggle
    window.addEventListener('keydown', (e) => {
      if (e.key === '`' || e.key === '~') {
        this.debugMode = !this.debugMode;
        (window as any).DEBUG = this.debugMode;
        console.log('[debug] Debug mode:', this.debugMode ? 'ON' : 'OFF');
      }
    });

    // Mouse wheel for zoom (board) or scroll (tray)
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (this.isInTray(screenY)) {
        // Scroll tray
        this.trayScrollX += e.deltaY;
        this.clampTrayScroll();
        this.updateTrayPiecePositions();
      } else {
        // Zoom board toward cursor
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoomAtPoint(screenX, screenY, zoomFactor);
      }
    });

    // Mouse down for pan/rotate
    canvas.addEventListener('mousedown', (e) => {
      if (this.isDragging) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Check if clicking on a piece
      const hitPiece = this.getPieceAtScreen(screenX, screenY);

      if (e.button === 0) {
        // Left click
        if (!hitPiece && !this.isInTray(screenY)) {
          // Pan board
          this.isPanning = true;
          this.panStart = { x: screenX, y: screenY };
          this.boardTransformStart = { ...this.boardTransform };
          canvas.requestPointerLock();
        } else if (this.isInTray(screenY) && !hitPiece) {
          // Tray drag scroll
          this.inputManager.startTrayDrag(screenX);
        }
      } else if (e.button === 2) {
        // Right click
        if (hitPiece) {
          // Rotate piece - grab it first if not already grabbed
          const pieceIndex = (hitPiece as any).pieceIndex;
          if (!this.isDragging) {
            this.onPieceGrab?.(pieceIndex);
          }
          this.isRotatingPiece = true;
          this.rotatingPiece = hitPiece;
          this.rotationStartAngle = hitPiece.rotation;
          hitPiece.zIndex = 1000;
          canvas.requestPointerLock();
        } else if (!this.isInTray(screenY)) {
          // Rotate board
          this.isRotatingBoard = true;
          this.panStart = { x: screenX, y: screenY };
          this.boardTransformStart = { ...this.boardTransform };
          canvas.requestPointerLock();
        }
      }
    });

    // Mouse move for pan/rotate
    canvas.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const dx = e.movementX;
        const dy = e.movementY;
        this.boardTransform.x += dx;
        this.boardTransform.y += dy;
        this.applyBoardTransform();
      } else if (this.isRotatingBoard) {
        const dx = e.movementX;
        this.boardTransform.rotation += dx * 0.005;
        this.applyBoardTransform();
      } else if (this.isRotatingPiece && this.rotatingPiece) {
        const dx = e.movementX;
        this.rotatingPiece.rotation += dx * 0.01;
        const pieceIndex = (this.rotatingPiece as any).pieceIndex;
        this.onPieceRotate?.(pieceIndex, this.rotatingPiece.rotation);
      }

      // Handle tray drag
      this.inputManager.handleTrayDrag(e.movementX);
    });

    // Mouse up
    canvas.addEventListener('mouseup', (e) => {
      if (this.isPanning || this.isRotatingBoard || this.isRotatingPiece) {
        document.exitPointerLock();
      }

      // If we were rotating a piece (right-click), drop it
      if (this.isRotatingPiece && this.rotatingPiece && e.button === 2) {
        const pieceIndex = (this.rotatingPiece as any).pieceIndex;
        this.rotatingPiece.zIndex = 0;
        // Only emit drop if we weren't also dragging
        if (!this.isDragging) {
          this.onPieceDrop?.(pieceIndex, this.rotatingPiece.x, this.rotatingPiece.y, this.rotatingPiece.rotation);
        }
        this.rotatingPiece = null;
      }

      this.isPanning = false;
      this.isRotatingBoard = false;
      this.isRotatingPiece = false;
      this.inputManager.endTrayDrag();
    });

    // Touch events handled by InputManager
    canvas.addEventListener('touchstart', (e) => this.inputManager.handleTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.inputManager.handleTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.inputManager.handleTouchEnd(e), { passive: false });
    canvas.addEventListener('touchcancel', (e) => this.inputManager.handleTouchEnd(e), { passive: false });
  }

  private getPieceAtScreen(screenX: number, screenY: number): Sprite | null {
    // Check board pieces
    const boardPos = this.screenToBoard({ x: screenX, y: screenY });
    for (const [, sprite] of this.pieces) {
      if (!this.pieceInTray.get((sprite as any).pieceIndex)) {
        const bounds = sprite.getBounds();
        // Convert bounds to board space check
        const localX = boardPos.x - sprite.x;
        const localY = boardPos.y - sprite.y;
        const halfW = sprite.width / 2;
        const halfH = sprite.height / 2;
        if (localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH) {
          return sprite;
        }
      }
    }
    return null;
  }

  private zoomAtPoint(screenX: number, screenY: number, factor: number) {
    const oldScale = this.boardTransform.scale;
    const newScale = Math.max(0.25, Math.min(4, oldScale * factor));

    if (newScale === oldScale) return;

    // Get world position under cursor before scaling (using current container transform)
    const worldPos = this.boardContainer.toLocal(new Point(screenX, screenY));

    // Update scale
    this.boardTransform.scale = newScale;

    // Adjust position so worldPos stays under cursor after scaling
    this.boardTransform.x = screenX - worldPos.x * newScale;
    this.boardTransform.y = screenY - worldPos.y * newScale;

    this.applyBoardTransform();
  }

  private clampTrayScroll() {
    const trayPieceCount = Array.from(this.pieceInTray.values()).filter((v) => v).length;
    const maxScroll = Math.max(0, trayPieceCount * this.trayPieceSpacing - this.app.screen.width + this.trayPiecePadding * 2);
    this.trayScrollX = Math.max(0, Math.min(maxScroll, this.trayScrollX));
  }

  // Called by InputManager for tray scrolling
  scrollTray(delta: number) {
    this.trayScrollX += delta;
    this.clampTrayScroll();
    this.updateTrayPiecePositions();
  }

  // Called by InputManager for mobile zoom
  zoomBoard(centerX: number, centerY: number, scaleDelta: number) {
    if (this.isInTray(centerY)) return;
    this.zoomAtPoint(centerX, centerY, scaleDelta);
  }

  // Called by InputManager for mobile pan
  panBoard(dx: number, dy: number) {
    this.boardTransform.x += dx;
    this.boardTransform.y += dy;
    this.applyBoardTransform();
  }

  // Called by InputManager for mobile board rotation
  rotateBoard(angleDelta: number) {
    this.boardTransform.rotation += angleDelta;
    this.applyBoardTransform();
  }

  // Called by InputManager for mobile piece rotation
  rotatePiece(angleDelta: number) {
    // Use rotatingPiece if set (touch rotation), otherwise draggedPiece
    const piece = this.rotatingPiece || this.draggedPiece;
    if (piece) {
      piece.rotation += angleDelta;
      const pieceIndex = (piece as any).pieceIndex;
      this.onPieceRotate?.(pieceIndex, piece.rotation);
    }
  }

  // Check if there's a piece at screen coordinates
  hasPieceAtScreen(screenX: number, screenY: number): boolean {
    return this.getPieceAtScreen(screenX, screenY) !== null;
  }

  // Start touch-based piece rotation (two-finger on piece)
  startTouchPieceRotation(screenX: number, screenY: number): boolean {
    const piece = this.getPieceAtScreen(screenX, screenY);
    if (piece) {
      const pieceIndex = (piece as any).pieceIndex;
      this.rotatingPiece = piece;
      piece.zIndex = 1000;
      // Grab the piece for network sync
      this.onPieceGrab?.(pieceIndex);
      return true;
    }
    return false;
  }

  // End touch-based piece rotation
  endTouchPieceRotation() {
    if (this.rotatingPiece) {
      const pieceIndex = (this.rotatingPiece as any).pieceIndex;
      this.rotatingPiece.zIndex = 0;
      // Drop the piece for network sync
      this.onPieceDrop?.(pieceIndex, this.rotatingPiece.x, this.rotatingPiece.y, this.rotatingPiece.rotation);
      this.rotatingPiece = null;
    }
  }

  // Public API for socket events
  setHandlers(handlers: {
    onPieceGrab: (pieceIndex: number) => void;
    onPieceMove: (pieceIndex: number, x: number, y: number) => void;
    onPieceDrop: (pieceIndex: number, x: number, y: number, rotation: number) => void;
    onPieceRotate?: (pieceIndex: number, rotation: number) => void;
  }) {
    this.onPieceGrab = handlers.onPieceGrab;
    this.onPieceMove = handlers.onPieceMove;
    this.onPieceDrop = handlers.onPieceDrop;
    this.onPieceRotate = handlers.onPieceRotate;
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

  // Cursor presence methods - positions in board space
  addCursor(playerId: string, displayName: string) {
    if (this.cursors.has(playerId)) return;

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

    this.boardContainer.addChild(cursorContainer);
    this.cursors.set(playerId, { sprite: cursorContainer, label });
  }

  updateCursor(playerId: string, x: number, y: number) {
    const cursor = this.cursors.get(playerId);
    if (!cursor) return;

    // Positions are in board space
    cursor.sprite.x = x;
    cursor.sprite.y = y;
    cursor.sprite.visible = true;
  }

  removeCursor(playerId: string) {
    const cursor = this.cursors.get(playerId);
    if (!cursor) return;

    this.boardContainer.removeChild(cursor.sprite);
    this.cursors.delete(playerId);
  }

  // Get current cursor position in board space (for broadcasting)
  getLocalCursorBoardPosition(screenX: number, screenY: number): Point | null {
    if (this.isInTray(screenY)) return null;
    return this.screenToBoard({ x: screenX, y: screenY });
  }

  destroy() {
    this.destroyed = true;
    window.removeEventListener('resize', this.handleResize);
    if (this.initialized && this.app.stage) {
      this.app.destroy(true);
    }
  }
}
