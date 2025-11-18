import { Card } from "../game/engine/cards";
import {
  createInitialGame,
  DecisionFn,
  GameEngine,
  GameState,
  PreviousRoundSnapshot,
} from "../game/engine/gameEngineDemo";
import {
  ManualDecisionNeeded,
  ManualDecisionRequest,
} from "../game/engine/manualController";
import { Result } from "../game/engine/judgeResult";
import { PlayerSession } from "./PlayerSession";

export type RoomStatus = "WAITING" | "RUNNING" | "FINISHED";

export interface RoomOptions {
  id?: string;
  maxPlayers: number;
  label?: string;
}

export interface StartGameOptions {
  previousRound?: PreviousRoundSnapshot | null;
}

export interface RoomEventHandlers {
  onStateChange?: (state: GameState, room: RoomInstance) => void;
  onManualRequest?: (
    session: PlayerSession | null,
    request: ManualDecisionRequest,
    room: RoomInstance
  ) => void;
  onGameOver?: (state: GameState, room: RoomInstance) => void;
}

export class RoomInstance {
  readonly id: string;
  readonly maxPlayers: number;
  readonly label?: string;

  private status: RoomStatus = "WAITING";
  private engineWrapper: ReturnType<typeof createInitialGame> | null = null;
  private sessions: PlayerSession[] = [];
  private handlers: RoomEventHandlers;
  private latestState: GameState | null = null;
  private playerIdToSession = new Map<string, PlayerSession>();

  constructor(options: RoomOptions, handlers: RoomEventHandlers = {}) {
    this.id = options.id ?? RoomInstance.createRoomId();
    this.maxPlayers = options.maxPlayers;
    this.label = options.label;
    this.handlers = handlers;
  }

  get currentStatus(): RoomStatus {
    return this.status;
  }

  setHandlers(handlers: RoomEventHandlers): void {
    this.handlers = handlers;
  }

  get players(): readonly PlayerSession[] {
    return this.sessions;
  }

  get state(): GameState | null {
    return this.latestState;
  }

  get engine(): GameEngine | null {
    return this.engineWrapper?.engine ?? null;
  }

  get lastResult(): Result | null {
    return this.engine?.lastResult ?? null;
  }

  addPlayer(session: PlayerSession): void {
    if (this.status !== "WAITING") {
      throw new Error("Room already started; cannot add players.");
    }
    if (this.sessions.length >= this.maxPlayers) {
      throw new Error("Room is full.");
    }
    if (this.sessions.some((existing) => existing.id === session.id)) {
      throw new Error("Player already in this room.");
    }
    session.assignSeat(this.sessions.length);
    this.sessions.push(session);
  }

  removePlayer(sessionId: string): void {
    const idx = this.sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) return;
    const [session] = this.sessions.splice(idx, 1);
    session.assignSeat(null);
    if (this.status === "WAITING") {
      // reassign seat indices
      this.sessions.forEach((player, seatIdx) => player.assignSeat(seatIdx));
    }
  }

  startGame(options: StartGameOptions = {}): void {
    if (this.status !== "WAITING") {
      throw new Error("Room already running.");
    }
    if (this.sessions.length !== this.maxPlayers) {
      throw new Error(
        `Room requires ${this.maxPlayers} players before starting.`
      );
    }

    const controllers: Partial<Record<string, DecisionFn>> = {};
    const playerNames: string[] = [];
    this.playerIdToSession.clear();

    this.sessions.forEach((session, idx) => {
      const playerId = `P${idx + 1}`;
      playerNames[idx] = session.displayName;
      session.assignSeat(idx);
      const decision = session.getDecisionFn();
      if (decision) {
        controllers[playerId] = decision;
      }
      this.playerIdToSession.set(playerId, session);
    });

    this.engineWrapper = createInitialGame(this.maxPlayers, {
      controllers,
      playerNames,
      previousRound: options.previousRound,
    });
    this.latestState = this.engineWrapper.state;
    this.status = "RUNNING";
    this.emitState();
  }

  playTurns(runUntilManual = false): void {
    if (!this.engineWrapper) {
      throw new Error("Room has not started yet.");
    }

    const { engine } = this.engineWrapper;
    if (engine.state.gameOver) {
      this.emitState();
      return;
    }

    while (!engine.state.gameOver) {
      try {
        engine.playAutoTurn();
      } catch (error) {
        if (error instanceof ManualDecisionNeeded) {
          const session =
            this.playerIdToSession.get(error.request.playerId) ?? null;
          session?.notifyManualDecisionNeeded(error.request);
          this.handlers.onManualRequest?.(session, error.request, this);
          break;
        }
        throw error;
      }

      if (!runUntilManual) {
        break;
      }
    }

    this.emitState();
  }

  submitManualDecision(sessionId: string, cards: Card[] | null): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error("Unknown player session.");
    }
    session.submitManualDecision(cards);
    this.playTurns(true);
  }

  private emitState(): void {
    if (!this.engineWrapper) return;
    const baseState = this.engineWrapper.engine.state;
    this.latestState = {
      ...baseState,
      players: baseState.players.map((player) => ({
        ...player,
        hand: [...player.hand],
      })),
      result: this.engineWrapper.engine.lastResult ?? baseState.result ?? null,
    };
    this.handlers.onStateChange?.(this.latestState, this);
    if (this.latestState.gameOver && this.status !== "FINISHED") {
      this.status = "FINISHED";
      this.handlers.onGameOver?.(this.latestState, this);
    }
  }

  private static createRoomId(): string {
    return `R-${Math.random().toString(36).slice(2, 8)}`;
  }
}
