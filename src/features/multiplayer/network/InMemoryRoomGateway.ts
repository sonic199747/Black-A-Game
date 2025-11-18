import { Card } from "@/features/game/engine/cards";
import { GameState } from "@/features/game/engine/gameEngineDemo";
import { ManualDecisionRequest } from "@/features/game/engine/manualController";
import { PlayerSession, PlayerSessionKind } from "../PlayerSession";
import { RoomInstance } from "../RoomInstance";
import { RoomManager } from "../RoomManager";
import { RoomSummary } from "../types";

export type GatewayRoomEvent =
  | { type: "ROOMS_UPDATED"; rooms: RoomSummary[] }
  | { type: "STATE_UPDATED"; roomId: string; state: GameState }
  | {
      type: "MANUAL_REQUIRED";
      roomId: string;
      sessionId: string;
      request: ManualDecisionRequest;
    };

export type GatewayCommand =
  | { type: "CREATE_ROOM"; label?: string; maxPlayers?: number }
  | { type: "LIST_ROOMS" }
  | {
      type: "JOIN_ROOM";
      roomId: string;
      sessionId?: string;
      displayName: string;
      kind: PlayerSessionKind;
    }
  | { type: "START_GAME"; roomId: string }
  | { type: "PLAY_TURN"; roomId: string; runUntilManual?: boolean }
  | {
      type: "SUBMIT_MANUAL";
      roomId: string;
      sessionId: string;
      cards: Card[] | null;
    };

interface ConnectedClient {
  id: string;
  send(event: GatewayRoomEvent): void;
}

export class InMemoryRoomGateway {
  private readonly manager: RoomManager;
  private readonly clients = new Map<string, ConnectedClient>();
  private readonly managedRoomIds = new Set<string>();

  constructor(manager?: RoomManager) {
    this.manager = manager ?? new RoomManager();
    this.manager.listRooms().forEach((room) => this.attachHandlers(room));
  }

  connect(clientId: string, handler: (event: GatewayRoomEvent) => void) {
    const client: ConnectedClient = {
      id: clientId,
      send: handler,
    };
    this.clients.set(clientId, client);
    this.emitRooms();
    return {
      disconnect: () => {
        this.clients.delete(clientId);
      },
      sendCommand: (command: GatewayCommand) =>
        this.handleCommand(client, command),
    };
  }

  private handleCommand(client: ConnectedClient, command: GatewayCommand) {
    switch (command.type) {
      case "CREATE_ROOM": {
        const room = this.manager.createRoom({
          label: command.label,
          maxPlayers: command.maxPlayers ?? 6,
        });
        this.attachHandlers(room);
        this.emitRooms();
        return room.id;
      }
      case "LIST_ROOMS": {
        const summaries = this.manager
          .listRooms()
          .map((room) => this.buildSummary(room));
        client.send({ type: "ROOMS_UPDATED", rooms: summaries });
        return summaries;
      }
      case "JOIN_ROOM": {
        const room = this.requireRoom(command.roomId);
        this.attachHandlers(room);
        const session = new PlayerSession({
          id: command.sessionId,
          displayName: command.displayName,
          kind: command.kind,
        });
        room.addPlayer(session);
        this.emitRooms();
        return session.id;
      }
      case "START_GAME": {
        const room = this.requireRoom(command.roomId);
        this.attachHandlers(room);
        room.startGame();
        this.broadcastState(room);
        this.emitRooms();
        return;
      }
      case "PLAY_TURN": {
        const room = this.requireRoom(command.roomId);
        this.attachHandlers(room);
        try {
          this.ensureRoomReadyForPlay(room);
          room.playTurns(command.runUntilManual);
          this.broadcastState(room);
        } catch (error) {
          this.emitRooms();
          throw error;
        }
        this.emitRooms();
        return;
      }
      case "SUBMIT_MANUAL": {
        const room = this.requireRoom(command.roomId);
        this.attachHandlers(room);
        this.ensureRoomReadyForPlay(room);
        room.submitManualDecision(command.sessionId, command.cards);
        this.broadcastState(room);
        this.emitRooms();
        return;
      }
      default:
        throw new Error("Unknown command");
    }
  }

  private requireRoom(roomId: string): RoomInstance {
    const room = this.manager.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }
    return room;
  }

  private attachHandlers(room: RoomInstance) {
    if (this.managedRoomIds.has(room.id)) return;
    room.setHandlers({
      onStateChange: () => {
        this.broadcastState(room);
        this.emitRooms();
      },
      onManualRequest: (session, request) => {
        const sessionId = session?.id ?? request.playerId;
        this.clients.forEach((client) =>
          client.send({
            type: "MANUAL_REQUIRED",
            roomId: room.id,
            sessionId,
            request,
          })
        );
      },
      onGameOver: () => {
        this.emitRooms();
      },
    });
    this.managedRoomIds.add(room.id);
  }

  private emitRooms() {
    const summaries = this.manager
      .listRooms()
      .map((room) => this.buildSummary(room));
    this.clients.forEach((client) =>
      client.send({ type: "ROOMS_UPDATED", rooms: summaries })
    );
  }

  private broadcastState(room: RoomInstance) {
    if (!room.state) return;
    const stateSnapshot: GameState = {
      ...room.state,
      players: room.state.players.map((player) => ({
        ...player,
        hand: [...player.hand],
      })),
    };
    this.clients.forEach((client) =>
      client.send({
        type: "STATE_UPDATED",
        roomId: room.id,
        state: stateSnapshot,
      })
    );
  }

  private buildSummary(room: RoomInstance): RoomSummary {
    const baseState = room.state;
    const playerCount = room.players.length;
    return {
      id: room.id,
      label: room.label ?? `房间 ${room.id.slice(-4)}`,
      status: room.currentStatus,
      playerCount,
      maxPlayers: room.maxPlayers,
      finishCount: baseState?.finishCount ?? 0,
      gameOver: baseState?.gameOver ?? false,
      waitingForManual: false,
      currentPlayerName: baseState
        ? baseState.players[baseState.currentPlayerIndex]?.name
        : undefined,
      lastUpdated: Date.now(),
    };
  }

  private ensureRoomReadyForPlay(room: RoomInstance): void {
    if (room.currentStatus !== "WAITING") {
      return;
    }
    const joinedPlayers = room.players.length;
    if (joinedPlayers !== room.maxPlayers) {
      throw new Error(
        `Room requires ${room.maxPlayers} players before starting (current: ${joinedPlayers}).`
      );
    }
    room.startGame();
  }
}
