// src/server/SimpleGameServer.ts
// 简化的游戏服务器 - 一切从简，能用就行

import type { Card } from "../features/game/engine/cards";
import type {
  DecisionFn,
  GameState,
} from "../shared/gameEngine/gameEngineDemo";
import {
  createInitialGame,
  recommendPlay,
} from "../shared/gameEngine/gameEngineDemo";

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
  readonly isAI: boolean; // 标记是否为AI玩家
  isReady = false;
  seatIndex: number | null = null;
  playerId: string | null = null; // 游戏中的玩家 ID (P1, P2, etc.)
  pendingDecision: Card[] | null = null;
  decisionResolved = false; // 标记决策是否已被处理

  constructor(id: string, displayName: string, isAI = false) {
    this.id = id;
    this.displayName = displayName;
    this.isAI = isAI;
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

    // 清空所有玩家的决策状态
    this.sessions.forEach((s) => s.clearDecision());

    // 创建决策控制器：为每个玩家创建一个决策函数
    const controllers: Partial<Record<string, DecisionFn>> = {};
    this.sessions.forEach((session, index) => {
      const playerId = `P${index + 1}`;
      session.playerId = playerId;

      if (session.isAI) {
        // AI 玩家：使用智能决策
        controllers[playerId] = (state, playerIndex, context) => {
          try {
            const decision = recommendPlay(state, playerIndex, context);
            console.log(
              `[GameRoom] AI ${session.displayName} (${playerId}) 决策:`,
              decision ? `${decision.length}张牌` : "过牌",
              `上下文: ${context.type}`
            );
            return decision;
          } catch (error) {
            console.error(
              `[GameRoom] AI ${session.displayName} 决策失败:`,
              error
            );
            return null; // 过牌
          }
        };
      } else {
        // 真人玩家：等待手动决策
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
      }
    });

    this.gameWrapper = createInitialGame(this.maxPlayers, {
      playerNames,
      controllers,
    });

    this.status = "playing";
    console.log("[GameRoom] 游戏已开始，玩家:", playerNames);
  }

  // 游戏开始后的初始推进（让AI玩家自动执行到第一个真人玩家）
  initialAdvance(): boolean {
    if (!this.gameWrapper) {
      console.error("[GameRoom] 游戏未开始，无法初始推进");
      return false;
    }

    console.log("[GameRoom] 开始初始游戏推进...");
    return this.advanceGame();
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

      // 获取当前玩家信息
      const currentPlayerIndex = this.gameWrapper.state.currentPlayerIndex;
      const currentPlayer = this.gameWrapper.state.players[currentPlayerIndex];
      const currentSession = this.sessions.find(
        (s) => s.playerId === currentPlayer.id
      );

      // 如果当前玩家是真人且未提交决策，等待
      if (
        currentSession &&
        !currentSession.isAI &&
        !currentSession.decisionResolved
      ) {
        console.log(
          `[GameRoom] 等待玩家 ${currentSession.displayName} (${currentPlayer.id}) 决策，` +
            `尝试次数: ${attempts}`
        );
        return true; // 需要等待玩家决策
      }

      // 记录执行前的状态，用于调试
      const beforePlayerIndex = currentPlayerIndex;
      const beforeGameOver = this.gameWrapper.state.gameOver;

      // 执行一个回合
      try {
        this.gameWrapper.engine.playAutoTurn();
      } catch (error) {
        console.error("[GameRoom] 回合执行失败:", error);
        return false;
      }

      // 检查状态变化
      const afterPlayerIndex = this.gameWrapper.state.currentPlayerIndex;
      const afterGameOver = this.gameWrapper.state.gameOver;

      console.log(
        `[GameRoom] 回合执行: 尝试${attempts}, ` +
          `玩家 ${beforePlayerIndex} → ${afterPlayerIndex}, ` +
          `游戏结束: ${afterGameOver}`
      );

      // 如果回合推进了或游戏结束了，清除所有玩家的决策标记
      if (beforePlayerIndex !== afterPlayerIndex || afterGameOver) {
        this.sessions.forEach((s) => {
          if (s.decisionResolved) {
            s.clearDecision();
          }
        });
      }

      // 如果状态完全没有变化，说明可能出现了死循环
      if (
        beforePlayerIndex === afterPlayerIndex &&
        beforeGameOver === afterGameOver &&
        !afterGameOver
      ) {
        console.error(
          `[GameRoom] 警告：状态未改变！`,
          `当前玩家: ${currentPlayer.name} (${currentPlayer.id})`,
          `Session: ${
            currentSession
              ? `isAI=${currentSession.isAI}, resolved=${currentSession.decisionResolved}`
              : "未找到"
          }`
        );
        // 继续循环一次，看看下次是否能推进
        if (attempts > 3) {
          // 如果连续3次都没推进，则报错退出
          return false;
        }
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
        isAI: s.isAI,
      })),
    };

    // 如果游戏已开始，包含游戏状态
    if (this.gameWrapper && this.status === "playing") {
      // 创建游戏状态的深拷贝，确保React能检测到变化
      const gameState = JSON.parse(JSON.stringify(this.gameWrapper.state));
      return {
        ...baseInfo,
        gameState,
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

          // 开始游戏
          room.startGame();

          // 游戏开始后，立即推进游戏（AI会自动执行，直到遇到真人玩家）
          const initialAdvance = room.initialAdvance();
          console.log("[SimpleGameServer] 游戏初始推进结果:", initialAdvance);

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

        case "ADD_AI_PLAYER": {
          const roomId = command.roomId || "default-room";
          const room = this.rooms.get(roomId);
          if (!room) throw new Error("房间不存在");

          // 检查房间是否已满
          const summary = room.getSummary();
          if (summary.playerCount >= room.maxPlayers) {
            throw new Error("房间已满，无法添加AI玩家");
          }

          // 生成AI玩家ID和昵称
          const aiId = `ai-${Date.now()}-${Math.random()}`;
          const aiName = command.displayName || `AI ${summary.playerCount + 1}`;

          // 创建AI会话
          const aiSession = new GameSession(aiId, aiName, true);
          this.clients.set(aiId, aiSession);

          // 加入房间
          room.addPlayer(aiSession);

          // AI自动准备
          room.setReady(aiSession.id, true);

          // 广播房间状态
          this.broadcastRoomState(roomId);

          return { success: true, aiId, aiName };
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
        isAI: p.isAI ?? false,
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
    const summaryWithGame = summary as any; // 类型断言避免TypeScript错误

    console.log("[SimpleGameServer] 房间状态更新:", {
      roomId,
      playerCount: summary.playerCount,
      readyCount: summary.players.filter((p: any) => p.isReady).length,
      status: summary.status,
      hasGameState: !!summaryWithGame.gameState,
    });

    // 找到房间内所有玩家的会话，给他们发送更新
    const roomSessions = Array.from(this.clients.values()).filter((session) => {
      // 检查这个 session 是否在这个房间
      return summary.players.some((p: any) => p.id === session.id);
    });

    // 发送 ROOM_STATE_UPDATED 事件
    const roomStateEvent: RoomServerEvent = {
      kind: "ROOM_STATE_UPDATED",
      roomId,
      state: roomState,
    };

    // 发送给房间内的所有客户端
    roomSessions.forEach((session) => {
      const send = this.clientSenders.get(session.id);
      if (send) {
        send(roomStateEvent);
      }
    });

    // 如果游戏正在进行，额外发送 GAME_STATE_UPDATED 事件
    if (summaryWithGame.gameState && summary.status === "playing") {
      const gameStateEvent: RoomServerEvent = {
        kind: "GAME_STATE_UPDATED",
        roomId,
        gameState: summaryWithGame.gameState,
      };

      roomSessions.forEach((session) => {
        const send = this.clientSenders.get(session.id);
        if (send) {
          send(gameStateEvent);
        }
      });

      console.log("[SimpleGameServer] 游戏状态已广播:", {
        currentPlayer:
          summaryWithGame.gameState.players[
            summaryWithGame.gameState.currentPlayerIndex
          ]?.name,
        currentPlayerIndex: summaryWithGame.gameState.currentPlayerIndex,
        playersHandCount: summaryWithGame.gameState.players.map(
          (p: any) => `${p.name}:${p.hand?.length || 0}张`
        ),
      });
    }
  }
}
