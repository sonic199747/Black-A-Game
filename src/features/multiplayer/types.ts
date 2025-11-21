// src/features/multiplayer/types.ts

import type { Card } from "@/features/game/engine/cards";
import type { GameState } from "@/features/game/engine/gameEngineDemo";

/** WebSocket / 网关连接状态 */
export type RoomGatewayConnectionState =
  | "disconnected"
  | "connecting"
  | "connected";

/** 房间玩家信息 */
export interface RoomPlayer {
  clientId: string;
  displayName: string;
  seat: number;
  isReady: boolean;
}

/** 房间状态 */
export interface RoomState {
  roomId: string;
  ownerId: string | null;
  players: RoomPlayer[];
  phase: "lobby" | "playing" | "finished";
  gameSnapshot: GameState | null;
}

/**
 * UI 层使用的统一视图模型
 */
export interface RoomGameViewModel {
  // 房间 & 游戏
  roomState: RoomState;
  gameState: GameState | null;

  // 当前玩家在 players 数组中的座位索引（-1 表示还没坐下/不在房间）
  mySeatIndex: number;

  // 网关连接状态
  connectionState: RoomGatewayConnectionState;

  // 行为方法
  playCards(cards: Card[]): void;
  pass(): void;
  readyUp(): void;
  cancelReady(): void;
  startGame(): void;
}
