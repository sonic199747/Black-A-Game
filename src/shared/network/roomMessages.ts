// src/shared/network/roomMessages.ts

import type { Card } from "@/features/game/engine/cards";
import type { GameState } from "@/features/game/engine/gameEngineDemo";

// ManualDecisionRequestPayload 和其他类型在下面定义
// (PreviousRoundSnapshot 在需要时可以从 gameEngineDemo 导入)

/**
 * 房间里的一个玩家（和纯游戏里的 PlayerState 不同，这是“房间视角”的玩家）
 */
export interface RoomPlayer {
  clientId: string; // 网关分配的 id（READY 里拿到）
  displayName: string; // 显示名称
  seat: number; // 座位号（0~5）
  isReady: boolean; // 是否已准备
}

/**
 * 房间整体状态，由服务器维护并广播
 */
export interface RoomState {
  roomId: string;
  ownerId: string | null; // 房主 / 创建者
  players: RoomPlayer[];
  phase: "lobby" | "playing" | "finished";
  gameSnapshot: GameState | null; // 当前这局游戏的快照
}

/** 客户端 -> 服务器：房间相关命令 */
export type RoomCommand =
  // 房间生命周期
  | { kind: "JOIN_ROOM"; roomId: string; displayName: string }
  | { kind: "LEAVE_ROOM"; roomId: string }
  | { kind: "READY_UP"; roomId: string }
  | { kind: "CANCEL_READY"; roomId: string }
  | { kind: "START_GAME"; roomId: string }

  // 游戏动作
  | { kind: "PLAY_CARDS"; roomId: string; cards: Card[] }
  | { kind: "PASS"; roomId: string };

/** 服务器 -> 客户端：房间 / 游戏事件 */
export type RoomServerEvent =
  // 加入 / 离开
  | { kind: "ROOM_JOINED"; roomId: string; state: RoomState }
  | { kind: "ROOM_LEFT"; roomId: string }

  // 房间状态整体更新（有人进出、准备、换座…）
  | { kind: "ROOM_STATE_UPDATED"; roomId: string; state: RoomState }

  // 玩家准备状态变化
  | {
      kind: "PLAYER_READY_CHANGED";
      roomId: string;
      seat: number;
      isReady: boolean;
      displayName: string;
    }

  // 游戏状态更新（出牌轮次变化、手牌变化等）
  | { kind: "GAME_STATE_UPDATED"; roomId: string; gameState: GameState }

  // 一些错误信息
  | { kind: "ERROR"; roomId?: string; message: string };

/**
 * 网关（gateway）发给客户端的顶层消息
 * 你之前 useRoomGateway.ts 里已经有类似定义，可以把那里的挪到这里统一。
 */
export type GatewayServerMessage =
  | { kind: "READY"; clientId: string }
  | { kind: "GATEWAY_EVENT"; event: RoomServerEvent }
  | {
      kind: "COMMAND_RESULT";
      requestId?: string;
      command: string;
      result: unknown;
    }
  | {
      kind: "COMMAND_ERROR";
      requestId?: string;
      command?: string;
      error: string;
      message?: string;
    };

/**
 * 客户端发给网关的顶层包裹：
 * - 可以直接发 RoomCommand
 * - 也可以带 requestId，用于需要明确应答的命令
 */
export type GatewayCommandRequest =
  | RoomCommand
  | {
      requestId: string;
      command: RoomCommand;
    };

// ========================================
// AuthoritativeRoomServer 使用的类型定义
// ========================================

export const MAX_ROOM_PLAYERS = 6;
export const TRIBUTE_ENABLED_FROM_ROUND = 2;

export type SeatIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type RoomPhase = "WAITING" | "RUNNING" | "FINISHED";

export interface RoomMetadataSnapshot {
  id: string;
  label: string;
  phase: RoomPhase;
  round: number;
  nextStartingSeat: number;
  tributeActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerControllerState {
  kind: "AI" | "HUMAN" | "AI_FALLBACK";
  sessionId: string;
  displayName: string;
  connected?: boolean;
  reason?: string;
}

export interface SeatSnapshot {
  seatIndex: SeatIndex;
  state: "EMPTY" | "OCCUPIED";
  controller?: PlayerControllerState;
  isReady?: boolean; // 玩家的准备状态
}

export interface LastPlaySummary {
  roomId: string;
  seatIndex: SeatIndex;
  playerName: string;
  playType: string;
  cardIds: string[];
  timestamp: number;
}

export interface RoomSnapshotPayload {
  metadata: RoomMetadataSnapshot;
  seats: SeatSnapshot[];
  gameState?: GameState;
  lastPlay?: LastPlaySummary;
}

export interface ManualDecisionRequestPayload {
  playerId: string;
  playerName: string;
  playerIndex: number;
  context: {
    type: "TURN" | "REACT" | "TRIBUTE_GIVE" | "TRIBUTE_RECEIVE";
    triggerPlayerIndex?: number;
  };
}

// 命令类型（使用 type 字段，用于 AuthoritativeRoomServer）
export interface CreateRoomCommand {
  type: "CREATE_ROOM";
  payload?: { label?: string };
}

export interface ListRoomsCommand {
  type: "LIST_ROOMS";
}

export interface JoinRoomCommand {
  type: "JOIN_ROOM";
  payload: {
    roomId: string;
    sessionId?: string;
    displayName: string;
  };
}

export interface LeaveRoomCommand {
  type: "LEAVE_ROOM";
  payload: { sessionId: string };
}

export interface StartGameCommand {
  type: "START_GAME";
  payload: { roomId: string };
}

export interface HeartbeatCommand {
  type: "HEARTBEAT";
  payload: { sessionId: string };
}

export interface PlayCardsCommand {
  type: "PLAY_CARDS";
  payload: {
    roomId: string;
    sessionId: string;
    cardIds: string[];
  };
}

export interface PassTurnCommand {
  type: "PASS_TURN";
  payload: {
    roomId: string;
    sessionId: string;
  };
}

export interface RequestHintCommand {
  type: "REQUEST_HINT";
  payload: {
    roomId: string;
    sessionId: string;
  };
}

export interface ReadyUpCommand {
  type: "READY_UP";
  payload: {
    roomId: string;
    sessionId: string;
  };
}

export interface CancelReadyCommand {
  type: "CANCEL_READY";
  payload: {
    roomId: string;
    sessionId: string;
  };
}

// AuthoritativeRoomServer 的命令联合类型
export type AuthoritativeRoomCommand =
  | CreateRoomCommand
  | ListRoomsCommand
  | JoinRoomCommand
  | LeaveRoomCommand
  | StartGameCommand
  | HeartbeatCommand
  | PlayCardsCommand
  | PassTurnCommand
  | RequestHintCommand
  | ReadyUpCommand
  | CancelReadyCommand;

// 服务器事件类型（使用 type 字段，用于 AuthoritativeRoomServer）
export interface RoomsListEvent {
  type: "ROOMS_LIST";
  payload: RoomSnapshotPayload[];
}

export interface RoomSnapshotEvent {
  type: "ROOM_SNAPSHOT";
  payload: RoomSnapshotPayload;
}

export interface ManualDecisionRequiredEvent {
  type: "MANUAL_DECISION_REQUIRED";
  payload: {
    roomId: string;
    sessionId: string;
    request: ManualDecisionRequestPayload;
  };
}

export interface PlayerReplacedEvent {
  type: "PLAYER_REPLACED";
  payload: {
    roomId: string;
    seatIndex: SeatIndex;
    controller: PlayerControllerState;
  };
}

export interface PlayerReadyChangedEvent {
  type: "PLAYER_READY_CHANGED";
  payload: {
    roomId: string;
    seatIndex: SeatIndex;
    isReady: boolean;
    displayName: string;
  };
}

export interface HintResultEvent {
  type: "HINT_RESULT";
  payload: {
    roomId: string;
    sessionId: string;
    cardIds: string[] | null;
    generatedAt: number;
  };
}

export type AuthoritativeRoomServerEvent =
  | RoomsListEvent
  | RoomSnapshotEvent
  | ManualDecisionRequiredEvent
  | PlayerReplacedEvent
  | PlayerReadyChangedEvent
  | HintResultEvent;
