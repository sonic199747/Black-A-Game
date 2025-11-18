import { useCallback, useEffect, useRef, useState } from "react";

import { Card } from "@/features/game/engine/cards";
import {
  GameState,
  PreviousRoundSnapshot,
} from "@/features/game/engine/gameEngineDemo";
import { ManualDecisionRequest } from "@/features/game/engine/manualController";
import { PlayerSession } from "../PlayerSession";
import { RoomInstance, RoomStatus } from "../RoomInstance";
import { RoomManager } from "../RoomManager";

export interface UseLocalRoomGameOptions {
  maxPlayers?: number;
  manualSeatIndex?: number | null;
  label?: string;
  autoStart?: boolean;
  manager?: RoomManager;
  roomId?: string;
}

export interface LocalRoomGameState {
  manager: RoomManager;
  room: RoomInstance | null;
  sessions: PlayerSession[];
  state: GameState | null;
  status: RoomStatus;
  manualRequest: ManualDecisionRequest | null;
  manualSession: PlayerSession | null;
  startRoom: () => void;
  startRoomWithSnapshot: (snapshot: PreviousRoundSnapshot | null) => void;
  playTurns: (runUntilManual?: boolean) => void;
  submitManualDecision: (cards: Card[] | null, sessionId?: string) => void;
  resetRoom: (options?: { removeRoom?: boolean }) => void;
}

export function useLocalRoomGame(
  options: UseLocalRoomGameOptions = {}
): LocalRoomGameState {
  const maxPlayers = options.maxPlayers ?? 6;
  const manualSeatIndex =
    options.manualSeatIndex === undefined ? 0 : options.manualSeatIndex;
  const autoStart = options.autoStart ?? true;

  const externalManager = options.manager;
  const managerRef = useRef<RoomManager | null>(null);
  if (!managerRef.current && !externalManager) {
    managerRef.current = new RoomManager();
  }
  const resolvedManager = externalManager ?? managerRef.current!;

  const roomRef = useRef<RoomInstance | null>(null);
  const sessionsRef = useRef<PlayerSession[]>([]);
  const manualSessionRef = useRef<PlayerSession | null>(null);

  const [state, setState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<RoomStatus>("WAITING");
  const [manualRequest, setManualRequest] =
    useState<ManualDecisionRequest | null>(null);
  const [manualSession, setManualSession] = useState<PlayerSession | null>(
    null
  );
  const [sessions, setSessions] = useState<PlayerSession[]>([]);

  useEffect(() => {
    if (!options.roomId) return;
    const existing = resolvedManager.getRoom(options.roomId);
    if (existing) {
      roomRef.current = existing;
    }
  }, [options.roomId, resolvedManager]);

  const ensureRoom = useCallback((): RoomInstance => {
    if (roomRef.current) {
      if (!options.roomId || roomRef.current.id === options.roomId) {
        return roomRef.current;
      }
    }
    let room: RoomInstance | undefined;
    if (options.roomId) {
      room = resolvedManager.getRoom(options.roomId);
    }
    if (!room) {
      room = resolvedManager.createRoom({
        id: options.roomId,
        maxPlayers,
        label: options.label,
      });
    }
    room.setHandlers({
      onStateChange: (nextState, currentRoom) => {
        setState(cloneState(nextState));
        setStatus(currentRoom.currentStatus);
      },
      onManualRequest: (session, request) => {
        setManualRequest(request);
        if (session) {
          manualSessionRef.current = session;
          setManualSession(session);
        }
      },
      onGameOver: (_, currentRoom) => {
        setStatus(currentRoom.currentStatus);
      },
    });
    roomRef.current = room;
    return room;
  }, [maxPlayers, options.label, options.roomId, resolvedManager]);

  const disposeSessions = useCallback(() => {
    sessionsRef.current.forEach((session) => session.dispose());
    sessionsRef.current = [];
    manualSessionRef.current = null;
    setManualSession(null);
  }, []);

  const resetRoom = useCallback(
    (options?: { removeRoom?: boolean }) => {
      const room = roomRef.current;
      if (room && options?.removeRoom !== false) {
        resolvedManager.removeRoom(room.id);
      }
      roomRef.current = null;
      disposeSessions();
      setSessions([]);
      setState(null);
      setStatus("WAITING");
      setManualRequest(null);
    },
    [disposeSessions, resolvedManager]
  );

  const startRoomInternal = useCallback(
    (snapshot?: PreviousRoundSnapshot | null) => {
      const room = ensureRoom();
      if (room.currentStatus !== "WAITING") {
        return;
      }

      setManualRequest(null);
      disposeSessions();

      const createdSessions = createDefaultSessions(maxPlayers, manualSeatIndex);
      sessionsRef.current = createdSessions;
      setSessions(createdSessions);

      const manual = createdSessions.find((session) => session.kind === "MANUAL");
      manualSessionRef.current = manual ?? null;
      setManualSession(manual ?? null);

      createdSessions.forEach((session) => room.addPlayer(session));
      room.startGame({ previousRound: snapshot ?? undefined });
    },
    [disposeSessions, ensureRoom, manualSeatIndex, maxPlayers]
  );

  const startRoom = useCallback(() => {
    startRoomInternal();
  }, [startRoomInternal]);

  const startRoomWithSnapshot = useCallback(
    (snapshot: PreviousRoundSnapshot | null) => {
      startRoomInternal(snapshot ?? undefined);
    },
    [startRoomInternal]
  );

  const playTurns = useCallback(
    (runUntilManual: boolean = false) => {
      const room = roomRef.current;
      if (!room) {
        throw new Error("Room has not started.");
      }
      setManualRequest(null);
      room.playTurns(runUntilManual);
    },
    []
  );

  const submitManualDecision = useCallback(
    (cards: Card[] | null, sessionId?: string) => {
      const room = roomRef.current;
      if (!room) {
        throw new Error("Room has not started.");
      }
      const targetSessionId =
        sessionId ?? manualSessionRef.current?.id ?? null;
      if (!targetSessionId) {
        throw new Error("No manual session available for decisions.");
      }
      setManualRequest(null);
      room.submitManualDecision(targetSessionId, cards);
    },
    []
  );

  useEffect(() => {
    const room = ensureRoom();
    if (room.state) {
      setState(cloneState(room.state));
      setStatus(room.currentStatus);
    }
    if (autoStart) {
      startRoom();
    }
  }, [autoStart, ensureRoom, startRoom]);

  useEffect(() => {
    return () => {
      if (!options.manager) {
        resetRoom();
      }
    };
  }, [options.manager, resetRoom]);

  return {
    manager: resolvedManager,
    room: roomRef.current,
    sessions,
    state,
    status,
    manualRequest,
    manualSession,
    startRoom,
    startRoomWithSnapshot,
    playTurns,
    submitManualDecision,
    resetRoom,
  };
}

function createDefaultSessions(
  maxPlayers: number,
  manualSeatIndex: number | null
): PlayerSession[] {
  return Array.from({ length: maxPlayers }, (_, index) => {
    const isManual = manualSeatIndex === index;
    return new PlayerSession({
      displayName: isManual ? "你" : `电脑（${index + 1}）`,
      kind: isManual ? "MANUAL" : "AI",
    });
  });
}

function cloneState(state: GameState | null): GameState | null {
  if (!state) return null;
  return {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      hand: [...player.hand],
    })),
    lastPlay: state.lastPlay
      ? {
          ...state.lastPlay,
          cards: [...state.lastPlay.cards],
        }
      : null,
  };
}
