// packages/client/src/game/InputManager.ts

export type GestureType = 'none' | 'drag' | 'pinch' | 'rotate' | 'pan' | 'tray-scroll';

interface TouchState {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface Game {
  isInTray(screenY: number): boolean;
  getTrayBounds(): { y: number; height: number };
  scrollTray(delta: number): void;
  zoomBoard(centerX: number, centerY: number, scaleDelta: number): void;
  panBoard(dx: number, dy: number): void;
  rotateBoard(angleDelta: number): void;
  rotatePiece(angleDelta: number): void;
  hasPieceAtScreen(screenX: number, screenY: number): boolean;
  startTouchPieceRotation(screenX: number, screenY: number): boolean;
  endTouchPieceRotation(): void;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private game: Game;

  // Touch state
  private activeTouches: Map<number, TouchState> = new Map();
  private initialPinchDistance = 0;
  private initialPinchAngle = 0;
  private lastPinchDistance = 0;
  private lastPinchAngle = 0;

  // Tray drag state
  private isTrayDragging = false;
  private trayDragStartX = 0;

  // Gesture detection
  private currentGesture: GestureType = 'none';
  private gestureStartTouches: TouchState[] = [];
  private isRotatingPieceTouch = false;

  constructor(canvas: HTMLCanvasElement, game: Game) {
    this.canvas = canvas;
    this.game = game;
  }

  // Desktop tray drag handling
  startTrayDrag(screenX: number) {
    this.isTrayDragging = true;
    this.trayDragStartX = screenX;
  }

  handleTrayDrag(movementX: number) {
    if (this.isTrayDragging) {
      this.game.scrollTray(-movementX);
    }
  }

  endTrayDrag() {
    this.isTrayDragging = false;
  }

  // Touch event handlers
  handleTouchStart(e: TouchEvent) {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();

    for (const touch of Array.from(e.changedTouches)) {
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      this.activeTouches.set(touch.identifier, {
        id: touch.identifier,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      });
    }

    // Detect gesture based on touch count
    this.detectGesture();
  }

  handleTouchMove(e: TouchEvent) {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();

    // Update touch positions
    for (const touch of Array.from(e.changedTouches)) {
      const state = this.activeTouches.get(touch.identifier);
      if (state) {
        state.currentX = touch.clientX - rect.left;
        state.currentY = touch.clientY - rect.top;
      }
    }

    // Process based on current gesture
    this.processGesture();
  }

  handleTouchEnd(e: TouchEvent) {
    e.preventDefault();

    for (const touch of Array.from(e.changedTouches)) {
      this.activeTouches.delete(touch.identifier);
    }

    // Reset gesture if no more touches
    if (this.activeTouches.size === 0) {
      this.currentGesture = 'none';
      this.gestureStartTouches = [];
      if (this.isRotatingPieceTouch) {
        this.game.endTouchPieceRotation();
        this.isRotatingPieceTouch = false;
      }
    } else {
      // Re-detect gesture with remaining touches
      if (this.isRotatingPieceTouch && this.activeTouches.size < 2) {
        this.game.endTouchPieceRotation();
        this.isRotatingPieceTouch = false;
      }
      this.detectGesture();
    }
  }

  private detectGesture() {
    const touches = Array.from(this.activeTouches.values());
    const touchCount = touches.length;

    if (touchCount === 0) {
      this.currentGesture = 'none';
      return;
    }

    // Store starting positions for gesture
    this.gestureStartTouches = touches.map((t) => ({ ...t }));

    // Check if any touch is in tray
    const anyInTray = touches.some((t) => this.game.isInTray(t.currentY));
    const allInTray = touches.every((t) => this.game.isInTray(t.currentY));

    if (touchCount === 1) {
      if (anyInTray) {
        this.currentGesture = 'tray-scroll';
      } else {
        // Single finger on board - could be piece drag or board pan
        // This is handled by PixiJS events for pieces
        this.currentGesture = 'pan';
      }
    } else if (touchCount === 2) {
      if (allInTray) {
        this.currentGesture = 'tray-scroll';
      } else {
        // Two fingers - pinch/rotate
        this.currentGesture = 'pinch';
        this.initializePinch(touches);

        // Check if center is on a piece for piece rotation
        const centerX = (touches[0].currentX + touches[1].currentX) / 2;
        const centerY = (touches[0].currentY + touches[1].currentY) / 2;
        this.isRotatingPieceTouch = this.game.startTouchPieceRotation(centerX, centerY);
      }
    } else if (touchCount >= 3) {
      // Three fingers - pan/rotate board (overrides everything)
      this.currentGesture = 'rotate';
      this.initializePinch(touches.slice(0, 2)); // Use first two for rotation tracking
    }
  }

  private initializePinch(touches: TouchState[]) {
    if (touches.length < 2) return;

    const dx = touches[1].currentX - touches[0].currentX;
    const dy = touches[1].currentY - touches[0].currentY;

    this.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
    this.lastPinchDistance = this.initialPinchDistance;

    this.initialPinchAngle = Math.atan2(dy, dx);
    this.lastPinchAngle = this.initialPinchAngle;
  }

  private processGesture() {
    const touches = Array.from(this.activeTouches.values());

    switch (this.currentGesture) {
      case 'tray-scroll':
        this.processTrayScroll(touches);
        break;
      case 'pan':
        this.processPan(touches);
        break;
      case 'pinch':
        this.processPinchZoom(touches);
        break;
      case 'rotate':
        this.processRotate(touches);
        break;
    }
  }

  private processTrayScroll(touches: TouchState[]) {
    if (touches.length === 0) return;

    // Calculate average horizontal movement
    let totalDx = 0;
    for (const touch of touches) {
      const start = this.gestureStartTouches.find((t) => t.id === touch.id);
      if (start) {
        totalDx += touch.currentX - start.currentX;
      }
    }

    const avgDx = totalDx / touches.length;

    // Update start positions for continuous scrolling
    for (const touch of touches) {
      const start = this.gestureStartTouches.find((t) => t.id === touch.id);
      if (start) {
        start.currentX = touch.currentX;
        start.currentY = touch.currentY;
      }
    }

    this.game.scrollTray(-avgDx);
  }

  private processPan(touches: TouchState[]) {
    if (touches.length === 0) return;

    const touch = touches[0];
    const start = this.gestureStartTouches.find((t) => t.id === touch.id);
    if (!start) return;

    const dx = touch.currentX - start.currentX;
    const dy = touch.currentY - start.currentY;

    // Update start position for continuous panning
    start.currentX = touch.currentX;
    start.currentY = touch.currentY;

    // Only pan if not in tray
    if (!this.game.isInTray(touch.currentY)) {
      this.game.panBoard(dx, dy);
    }
  }

  private processPinchZoom(touches: TouchState[]) {
    if (touches.length < 2) return;

    const dx = touches[1].currentX - touches[0].currentX;
    const dy = touches[1].currentY - touches[0].currentY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Calculate center
    const centerX = (touches[0].currentX + touches[1].currentX) / 2;
    const centerY = (touches[0].currentY + touches[1].currentY) / 2;

    // Zoom
    if (this.lastPinchDistance > 0) {
      const scaleDelta = distance / this.lastPinchDistance;
      this.game.zoomBoard(centerX, centerY, scaleDelta);
    }

    // Rotate (two-finger on piece = rotate piece, on empty = rotate board)
    const angleDelta = angle - this.lastPinchAngle;
    if (Math.abs(angleDelta) > 0.001) {
      if (!this.game.isInTray(centerY)) {
        if (this.isRotatingPieceTouch) {
          this.game.rotatePiece(angleDelta);
        } else {
          this.game.rotateBoard(angleDelta);
        }
      }
    }

    this.lastPinchDistance = distance;
    this.lastPinchAngle = angle;
  }

  private processRotate(touches: TouchState[]) {
    // Three-finger gesture - rotate and pan board
    if (touches.length < 2) return;

    const dx = touches[1].currentX - touches[0].currentX;
    const dy = touches[1].currentY - touches[0].currentY;

    const angle = Math.atan2(dy, dx);
    const angleDelta = angle - this.lastPinchAngle;

    // Rotate board
    if (Math.abs(angleDelta) > 0.001) {
      this.game.rotateBoard(angleDelta);
    }

    // Also pan with average movement of all touches
    let totalDx = 0;
    let totalDy = 0;
    for (const touch of touches) {
      const start = this.gestureStartTouches.find((t) => t.id === touch.id);
      if (start) {
        totalDx += touch.currentX - start.currentX;
        totalDy += touch.currentY - start.currentY;
        start.currentX = touch.currentX;
        start.currentY = touch.currentY;
      }
    }

    const avgDx = totalDx / touches.length;
    const avgDy = totalDy / touches.length;

    this.game.panBoard(avgDx, avgDy);

    this.lastPinchAngle = angle;
  }
}
