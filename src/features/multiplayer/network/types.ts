// features/game/multiplayer/network/types.ts
import type { Card } from "@/features/game/engine/cards";
import type { GameState } from "@/features/game/engine/gameEngineDemo";

// 连接状态（前端用）
export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error";

// 房间里一个玩家的概要信息（不一定包含手牌）
export interface RoomPlayerSummary {
  id: string; // 服务器那边分配的 playerId
  name: string;
  seatIndex: number; // 0 ~ N-1
  isConnected: boolean;
}

// 服务器推给客户端的房间整体视图
export interface RoomStatePayload {
  roomId: string;
  players: RoomPlayerSummary[];
  gameState: GameState; // 先简单直接把完整 GameState 发过来，后面想做“有视角”再改
  myPlayerId: string; // 我是谁（方便客户端判断“轮到没轮到我”）
}

// ==== 客户端 -> 服务器 ====

// 你可以只用 roomId，也可以让服务器自己生成，这里先写成“指定房间号”
export type ClientMessage =
  | {
      type: "join_room";
      roomId: string;
      playerName?: string;
    }
  | {
      type: "leave_room";
    }
  | {
      type: "submit_play";
      // 为简单起见，先直接把完整 Card 传过去，之后如果只要 id 再收紧
      cards: Card[];
    }
  | {
      type: "submit_pass";
    };

// ==== 服务器 -> 客户端 ====

export type ServerMessage =
  | {
      type: "room_state";
      state: RoomStatePayload;
    }
  | {
      type: "error";
      code: string;
      message: string;
    };
