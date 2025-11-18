import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/features/game/engine/cards";
import { GameState } from "@/features/game/engine/gameEngineDemo";
import { PlayerSessionKind } from "../PlayerSession";
import { RoomSummary } from "../types";
import { GatewayCommand } from "../network/InMemoryRoomGateway";
import { RoomGatewayConnectionState } from "../network/RoomGatewayClient";
import {
  ManualRequestState,
  RoomGatewayHookState,
  UseRoomGatewayOptions,
  useRoomGateway,
} from "./useRoomGateway";

export interface JoinedSessionInfo {
  id: string;
  roomId: string;
  kind: PlayerSessionKind;
  displayName: string;
}

export interface UseNetworkRoomGameOptions extends UseRoomGatewayOptions {
  initialRoomId?: string | null;
  defaultSessionKind?: PlayerSessionKind;
  defaultDisplayName?: string;
}

export interface NetworkRoomGameState {
  connectionState: RoomGatewayConnectionState;
  clientId?: string;
  rooms: RoomSummary[];
  roomStates: Record<string, GameState>;
  manualRequests: Record<string, ManualRequestState>;
  activeRoomId: string | null;
  activeRoomSummary: RoomSummary | null;
  activeRoomState: GameState | null;
  manualRequest: ManualRequestState | null;
  activeSession: JoinedSessionInfo | null;
  lastEvent: RoomGatewayHookState["lastEvent"];
  selectRoom: (roomId: string | null) => void;
  refreshRooms: () => Promise<RoomSummary[]>;
  createRoom: (params?: { label?: string; maxPlayers?: number }) => Promise<string>;
  joinRoom: (params: {
    roomId: string;
    kind?: PlayerSessionKind;
    displayName?: string;
    sessionId?: string;
  }) => Promise<string>;
  startGame: (roomId?: string | null) => Promise<void>;
  playTurns: (options?: {
    roomId?: string | null;
    runUntilManual?: boolean;
  }) => Promise<void>;
  submitManualDecision: (
    cards: Card[] | null,
    options?: { roomId?: string | null; sessionId?: string }
  ) => Promise<void>;
  sendCommand: RoomGatewayHookState["sendCommand"];
  connect: RoomGatewayHookState["connect"];
  disconnect: RoomGatewayHookState["disconnect"];
}

export function useNetworkRoomGame(
  options: UseNetworkRoomGameOptions = {}
): NetworkRoomGameState {
  const {
    initialRoomId = null,
    defaultSessionKind = "MANUAL",
    defaultDisplayName = "Player",
    ...gatewayOptions
  } = options;

  const gateway = useRoomGateway(gatewayOptions);
  const {
    rooms,
    roomStates,
    manualRequests,
    lastEvent,
    connectionState,
    clientId,
    connect,
    disconnect,
    sendCommand,
  } = gateway;

  const [activeRoomId, setActiveRoomId] = useState<string | null>(
    initialRoomId
  );
  const [activeSession, setActiveSession] = useState<JoinedSessionInfo | null>(
    null
  );

  useEffect(() => {
    if (initialRoomId) {
      setActiveRoomId(initialRoomId);
    }
  }, [initialRoomId]);

  useEffect(() => {
    setActiveSession((current) => {
      if (!current) return current;
      if (!activeRoomId || current.roomId !== activeRoomId) {
        return null;
      }
      return current;
    });
  }, [activeRoomId]);

  const activeRoomSummary = useMemo(() => {
    if (!activeRoomId) return null;
    return rooms.find((room) => room.id === activeRoomId) ?? null;
  }, [activeRoomId, rooms]);

  const activeRoomState = activeRoomId ? roomStates[activeRoomId] ?? null : null;
  const manualRequest = activeRoomId
    ? manualRequests[activeRoomId] ?? null
    : null;

  const selectRoom = useCallback((roomId: string | null) => {
    setActiveRoomId(roomId);
  }, []);

  const refreshRooms = useCallback(() => {
    return sendCommand<RoomSummary[]>({
      type: "LIST_ROOMS",
    });
  }, [sendCommand]);

  const createRoom = useCallback(
    async (params?: { label?: string; maxPlayers?: number }) => {
      const roomId = await sendCommand<string>({
        type: "CREATE_ROOM",
        label: params?.label,
        maxPlayers: params?.maxPlayers,
      });
      setActiveRoomId(roomId);
      setActiveSession(null);
      return roomId;
    },
    [sendCommand]
  );

  const joinRoom = useCallback(
    async (params: {
      roomId: string;
      kind?: PlayerSessionKind;
      displayName?: string;
      sessionId?: string;
    }) => {
      const kind = params.kind ?? defaultSessionKind;
      const displayName = params.displayName ?? defaultDisplayName;
      const sessionId = await sendCommand<string>({
        type: "JOIN_ROOM",
        roomId: params.roomId,
        sessionId: params.sessionId,
        displayName,
        kind,
      });
      setActiveRoomId(params.roomId);
      setActiveSession({
        id: sessionId,
        roomId: params.roomId,
        kind,
        displayName,
      });
      return sessionId;
    },
    [defaultDisplayName, defaultSessionKind, sendCommand]
  );

  const ensureRoomId = useCallback(
    (roomId?: string | null) => {
      const resolved = roomId ?? activeRoomId;
      if (!resolved) {
        throw new Error("No active room selected");
      }
      return resolved;
    },
    [activeRoomId]
  );

  const startGame = useCallback(
    async (roomId?: string | null) => {
      const targetRoomId = ensureRoomId(roomId);
      await sendCommand<void>({
        type: "START_GAME",
        roomId: targetRoomId,
      });
    },
    [ensureRoomId, sendCommand]
  );

  const playTurns = useCallback(
    async (options?: { roomId?: string | null; runUntilManual?: boolean }) => {
      const targetRoomId = ensureRoomId(options?.roomId);
      await sendCommand<void>({
        type: "PLAY_TURN",
        roomId: targetRoomId,
        runUntilManual: options?.runUntilManual,
      });
    },
    [ensureRoomId, sendCommand]
  );

  const submitManualDecision = useCallback(
    async (
      cards: Card[] | null,
      options?: { roomId?: string | null; sessionId?: string }
    ) => {
      const targetRoomId = ensureRoomId(options?.roomId);
      const fallbackSession =
        options?.sessionId ??
        activeSession?.id ??
        manualRequests[targetRoomId]?.sessionId;
      if (!fallbackSession) {
        throw new Error("No manual session available");
      }
      await sendCommand<void>({
        type: "SUBMIT_MANUAL",
        roomId: targetRoomId,
        sessionId: fallbackSession,
        cards,
      });
    },
    [activeSession?.id, ensureRoomId, manualRequests, sendCommand]
  );

  return {
    connectionState,
    clientId,
    rooms,
    roomStates,
    manualRequests,
    activeRoomId,
    activeRoomSummary,
    activeRoomState,
    manualRequest,
    activeSession,
    lastEvent,
    selectRoom,
    refreshRooms,
    createRoom,
    joinRoom,
    startGame,
    playTurns,
    submitManualDecision,
    sendCommand: sendCommand as <T = unknown>(command: GatewayCommand) => Promise<T>,
    connect,
    disconnect,
  };
}
