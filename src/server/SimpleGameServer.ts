// src/server/SimpleGameServer.ts
// 简化的游戏服务器 - 一切从简，能用就行

import type { Card } from "../features/game/engine/cards";
import type {
  DecisionFn,
  GameState,
} from "../shared/gameEngine/gameEngineDemo";
import { createInitialGame } from "../shared/gameEngine/gameEngineDemo";

// ==================== 协议定义 ====================

interface ClientCommand {
  type?: string;
  kind?: string;
  roomId?: string;
  displayName?: string;
  cards?: Card[];
  [key: string]: any;
}

// 使用与客户端一致的 RoomServerEvent 类型
type RoomServerEvent =
  | { kind: "ROOM_JOINED"; roomId: string; state: any }
  | { kind: "ROOM_LEFT"; roomId: string }
  | { kind: "ROOM_STATE_UPDATED"; roomId: string; state: any }
  | {
      kind: "PLAYER_READY_CHANGED";
      roomId: string;
      seat: number;
      isReady: boolean;
      displayName: string;
    }
  | { kind: "GAME_STATE_UPDATED"; roomId: string; gameState: GameState }
  | { kind: "ERROR"; roomId?: string; message: string };

type ServerEvent = RoomServerEvent;

// ==================== 玩家会话 ====================

class GameSession {
  readonly id: string;
  readonly displayName: string;
  isReady = false;
  seatIndex: number | null = null;
  playerId: string | null = null; // 游戏中的玩家 ID (P1, P2, etc.)
  pendingDecision: Card[] | null = null;
  decisionResolved = false; // 标记决策是否已被处理

  constructor(id: string, displayName: string) {
    this.id = id;
    this.displayName = displayName;
  }

  submitDecision(cards: Card[] | null) {
    this.pendingDecision = cards;
    this.decisionResolved = false;
  }

  clearDecision() {
    this.pendingDecision = null;
    this.decisionResolved = false;
  }

  markDecisionResolved() {
    this.decisionResolved = true;
  }
}

// ==================== 游戏房间 ====================

class GameRoom {
  readonly id: string;
  readonly maxPlayers = 6;
  private sessions: GameSession[] = [];
  private gameWrapper: ReturnType<typeof createInitialGame> | null = null;
  private status: "lobby" | "playing" | "finished" = "lobby";

  constructor(id: string) {
    this.id = id;
  }

  // 添加玩家
  addPlayer(session: GameSession): void {
    if (this.sessions.length >= this.maxPlayers) {
      throw new Error("房间已满");
    }
    session.seatIndex = this.sessions.length;
    this.sessions.push(session);
  }

  // 设置准备状态
  setReady(sessionId: string, isReady: boolean): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error("会话不存在");
    session.isReady = isReady;
  }

  // 检查是否全员准备
  isAllReady(): boolean {
    return (
      this.sessions.length === this.maxPlayers &&
      this.sessions.every((s) => s.isReady)
    );
  }

  // 开始游戏
  startGame(): void {
    if (!this.isAllReady()) {
      throw new Error("未全员准备");
    }

    const playerNames = this.sessions.map((s) => s.displayName);

    // 创建决策控制器：为每个玩家创建一个决策函数
    const controllers: Partial<Record<string, DecisionFn>> = {};
    this.sessions.forEach((session, index) => {
      const playerId = `P${index + 1}`;
      session.playerId = playerId;

      // 创建手动决策函数
      controllers[playerId] = (state, playerIndex, context) => {
        // 如果玩家已经提交了决策，返回它
        if (session.pendingDecision !== null && !session.decisionResolved) {
          const decision = session.pendingDecision;
          session.markDecisionResolved();
          console.log(
            `[GameRoom] 玩家 ${session.displayName} 使用决策:`,
            decision ? `${decision.length}张牌` : "过牌"
          );
          return decision;
        }

        // 否则返回 null，表示等待玩家决策
        return null;
      };
    });

    this.gameWrapper = createInitialGame(this.maxPlayers, {
      playerNames,
      controllers,
    });

    this.status = "playing";
    console.log("[GameRoom] 游戏已开始，玩家:", playerNames);
  }

  // 提交决策并推进游戏
  submitDecision(sessionId: string, cards: Card[] | null): boolean {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error("会话不存在");
    if (!this.gameWrapper) throw new Error("游戏未开始");

    // 检查是否轮到该玩家
    const currentPlayerIndex = this.gameWrapper.state.currentPlayerIndex;
    const currentPlayer = this.gameWrapper.state.players[currentPlayerIndex];

    if (currentPlayer.id !== session.playerId) {
      throw new Error(`当前不是你的回合，轮到 ${currentPlayer.name}`);
    }

    // 提交决策
    session.submitDecision(cards);
    console.log(
      `[GameRoom] 玩家 ${session.displayName} 提交决策:`,
      cards ? `${cards.length}张牌` : "过牌"
    );

    // 推进游戏回合
    return this.advanceGame();
  }

  // 推进游戏逻辑
  private advanceGame(): boolean {
    if (!this.gameWrapper) return false;

    const maxAttempts = 100; // 防止死循环
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      // 检查游戏是否结束
      if (this.gameWrapper.state.gameOver) {
        this.status = "finished";
        console.log("[GameRoom] 游戏结束！");
        return true;
      }

      // 执行一个回合
      try {
        this.gameWrapper.engine.playAutoTurn();
      } catch (error) {
        console.error("[GameRoom] 回合执行失败:", error);
        return false;
      }

      // 检查当前玩家是否需要人工决策
      const currentPlayerIndex = this.gameWrapper.state.currentPlayerIndex;
      const currentPlayer = this.gameWrapper.state.players[currentPlayerIndex];

      // 如果当前玩家还没提交决策，等待
      const currentSession = this.sessions.find(
        (s) => s.playerId === currentPlayer.id
      );
      if (currentSession && !currentSession.decisionResolved) {
        console.log(`[GameRoom] 等待玩家 ${currentSession.displayName} 决策`);
        return true; // 需要等待玩家决策
      }
    }

    console.warn("[GameRoom] 游戏推进超过最大尝试次数");
    return false;
  }

  // 获取游戏状态
  getState(): GameState | null {
    return this.gameWrapper?.state ?? null;
  }

  // 获取房间摘要
  getSummary() {
    const baseInfo = {
      id: this.id,
      playerCount: this.sessions.length,
      maxPlayers: this.maxPlayers,
      status: this.status,
      players: this.sessions.map((s) => ({
        id: s.id,
        displayName: s.displayName,
        seatIndex: s.seatIndex,
        isReady: s.isReady,
        playerId: s.playerId,
      })),
    };

    // 如果游戏已开始，包含游戏状态
    if (this.gameWrapper && this.status === "playing") {
      return {
        ...baseInfo,
        gameState: this.gameWrapper.state,
      };
    }

    return baseInfo;
  }

  // 获取当前需要决策的玩家
  getCurrentTurnSession(): GameSession | null {
    if (!this.gameWrapper || this.status !== "playing") return null;

    const currentPlayerIndex = this.gameWrapper.state.currentPlayerIndex;
    const currentPlayer = this.gameWrapper.state.players[currentPlayerIndex];

    return this.sessions.find((s) => s.playerId === currentPlayer.id) || null;
  }
}

// ==================== 服务器 ====================

export class SimpleGameServer {
  private rooms = new Map<string, GameRoom>();
  private clients = new Map<string, GameSession>();
  private clientSenders = new Map<string, (event: ServerEvent) => void>();

  // 客户端连接
  connect(
    clientId: string,
    send: (event: ServerEvent) => void
  ): {
    disconnect: () => void;
    handleCommand: (command: ClientCommand) => any;
  } {
    // 保存发送函数，用于广播
    this.clientSenders.set(clientId, send);

    return {
      disconnect: () => {
        this.clients.delete(clientId);
        this.clientSenders.delete(clientId);
      },
      handleCommand: (command: ClientCommand) =>
        this.handleCommand(clientId, command, send),
    };
  }

  // 处理命令
  private handleCommand(
    clientId: string,
    command: ClientCommand,
    send: (event: ServerEvent) => void
  ): any {
    try {
      const type = command.type || (command as any).kind;

      switch (type) {
        case "JOIN_ROOM": {
          const roomId = command.roomId || "default-room";
          const displayName = command.displayName || "玩家";

          // 创建或获取房间
          let room = this.rooms.get(roomId);
          if (!room) {
            room = new GameRoom(roomId);
            this.rooms.set(roomId, room);
          }

          // 创建会话
          const session = new GameSession(clientId, displayName);
          this.clients.set(clientId, session);

          // 加入房间
          room.addPlayer(session);

          // 获取房间状态并发送给当前玩家
          const summary = room.getSummary();
          const roomState = this.convertToRoomState(summary);

          const joinedEvent: RoomServerEvent = {
            kind: "ROOM_JOINED",
            roomId,
            state: roomState,
          };

          send(joinedEvent);

          // 广播房间状态给其他玩家
          this.broadcastRoomState(roomId);

          return { sessionId: clientId, roomId };
        }

        case "READY_UP": {
          const session = this.clients.get(clientId);
          if (!session) throw new Error("会话不存在");

          const roomId = command.roomId || "default-room";
          const room = this.rooms.get(roomId);
          if (!room) throw new Error("房间不存在");

          room.setReady(session.id, true);
          this.broadcastRoomState(roomId);
          return { success: true };
        }

        case "CANCEL_READY": {
          const session = this.clients.get(clientId);
          if (!session) throw new Error("会话不存在");

          const roomId = command.roomId || "default-room";
          const room = this.rooms.get(roomId);
          if (!room) throw new Error("房间不存在");

          room.setReady(session.id, false);
          this.broadcastRoomState(roomId);
          return { success: true };
        }

        case "START_GAME": {
          const roomId = command.roomId || "default-room";
          const room = this.rooms.get(roomId);
          if (!room) throw new Error("房间不存在");

          room.startGame();
          this.broadcastRoomState(roomId);
          return { success: true };
        }

        case "PLAY_CARDS": {
          const session = this.clients.get(clientId);
          if (!session) throw new Error("会话不存在");

          const roomId = command.roomId || "default-room";
          const room = this.rooms.get(roomId);
          if (!room) throw new Error("房间不存在");

          // 提交决策并推进游戏
          const gameAdvanced = room.submitDecision(
            session.id,
            command.cards || []
          );

          // 广播更新后的状态
          this.broadcastRoomState(roomId);

          return { success: true, gameAdvanced };
        }

        case "PASS": {
          const session = this.clients.get(clientId);
          if (!session) throw new Error("会话不存在");

          const roomId = command.roomId || "default-room";
          const room = this.rooms.get(roomId);
          if (!room) throw new Error("房间不存在");

          // 提交过牌决策并推进游戏
          const gameAdvanced = room.submitDecision(session.id, null);

          // 广播更新后的状态
          this.broadcastRoomState(roomId);

          return { success: true, gameAdvanced };
        }

        case "GET_ROOM_STATE": {
          const roomId = command.roomId || "default-room";
          const room = this.rooms.get(roomId);
          if (!room) throw new Error("房间不存在");

          return room.getSummary();
        }

        default:
          throw new Error(`未知命令: ${type}`);
      }
    } catch (error: any) {
      console.error("命令处理失败:", error.message);
      throw error;
    }
  }

  // 将服务器房间摘要转换为客户端 RoomState 格式
  private convertToRoomState(summary: any): any {
    const phase =
      summary.status === "lobby"
        ? "lobby"
        : summary.status === "playing"
        ? "playing"
        : "finished";

    return {
      roomId: summary.id,
      ownerId: summary.players[0]?.id || null,
      players: summary.players.map((p: any) => ({
        clientId: p.id,
        displayName: p.displayName,
        seat: p.seatIndex ?? 0,
        isReady: p.isReady ?? false,
      })),
      phase,
      gameSnapshot: summary.gameState || null,
    };
  }

  // 广播房间状态到房间内的所有玩家
  private broadcastRoomState(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const summary = room.getSummary();
    const roomState = this.convertToRoomState(summary);

    console.log("[SimpleGameServer] 房间状态更新:", {
      roomId,
      playerCount: summary.playerCount,
      readyCount: summary.players.filter((p: any) => p.isReady).length,
      status: summary.status,
    });

    // 找到房间内所有玩家的会话，给他们发送更新
    const roomSessions = Array.from(this.clients.values()).filter((session) => {
      // 检查这个 session 是否在这个房间
      return summary.players.some((p: any) => p.id === session.id);
    });

    // 发送 ROOM_STATE_UPDATED 事件
    const event: RoomServerEvent = {
      kind: "ROOM_STATE_UPDATED",
      roomId,
      state: roomState,
    };

    // 发送给房间内的所有客户端
    roomSessions.forEach((session) => {
      const send = this.clientSenders.get(session.id);
      if (send) {
        send(event);
      }
    });
  }
}
