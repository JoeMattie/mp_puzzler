// packages/shared/src/types.ts

export type TileType = 'classic' | `pentagon_${number}`;

export interface Piece {
  index: number;
  path: string;
  bounds: { x: number; y: number; w: number; h: number };
  centroid: { x: number; y: number };
  correctPosition: { x: number; y: number };
  correctRotation: number;
  edges: { neighborIndex: number; edgeId: string }[];
}

export interface Edge {
  id: string;
  pieces: [number, number];
  type: 'tab-blank' | 'flat';
}

export interface Stencil {
  pieces: Piece[];
  edges: Edge[];
  imageWidth: number;
  imageHeight: number;
}

export interface PieceState {
  index: number;
  x: number;
  y: number;
  rotation: number;
  inPanel: boolean;
  panelOrder: number | null;
  lockGroup: number | null;
}

export interface GameState {
  pieces: PieceState[];
  solvedEdges: string[];
  progress: number;
  playerCount: number;
}

export interface Player {
  id: string;
  displayName: string;
  isAdmin: boolean;
}

// Socket events
export interface ServerToClientEvents {
  'piece:grab:denied': (data: { pieceIndex: number; heldBy: string }) => void;
  'piece:grabbed': (data: { pieceIndex: number; lockGroup: number[]; byPlayer: string }) => void;
  'piece:moved': (data: { pieceIndex: number; x: number; y: number; byPlayer: string }) => void;
  'piece:rotated': (data: { pieceIndex: number; rotation: number; byPlayer: string }) => void;
  'piece:dropped': (data: { pieceIndex: number; x: number; y: number; rotation: number; snapped: boolean; newLockGroup: number[] | null }) => void;
  'piece:snapped': (data: { edges: string[]; lockGroup: number[] }) => void;
  'cursor:moved': (data: { playerId: string; displayName: string; x: number; y: number }) => void;
  'reaction:received': (data: { playerId: string; emoji: string; x: number; y: number }) => void;
  'player:joined': (data: Player) => void;
  'player:left': (data: { playerId: string }) => void;
  'game:completed': (data: { completedAt: string }) => void;
  'game:state': (data: GameState) => void;
}

export interface ClientToServerEvents {
  'piece:grab': (data: { pieceIndex: number }) => void;
  'piece:move': (data: { pieceIndex: number; x: number; y: number }) => void;
  'piece:rotate': (data: { pieceIndex: number; rotation: number }) => void;
  'piece:drop': (data: { pieceIndex: number; x: number; y: number; rotation: number }, callback: (response: { error?: string; x?: number; y?: number; rotation?: number; snapped?: boolean; edges?: string[] }) => void) => void;
  'piece:panel': (data: { pieceIndex: number; panelOrder: number }) => void;
  'cursor:move': (data: { x: number; y: number }) => void;
  'reaction:send': (data: { emoji: string; x: number; y: number }) => void;
}
