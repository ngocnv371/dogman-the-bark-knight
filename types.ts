export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Player extends GameObject {
  vy: number; // vertical velocity
  isGrounded: boolean;
}

export interface Platform extends GameObject {}

export interface Cat extends GameObject {}

export interface Bone extends GameObject {} // Collectible bone

export interface ThrownBone extends GameObject {
  vx: number; // horizontal velocity
  rotation: number;
}

export enum GameStatus {
  Start,
  Playing,
  GameOver,
}
