import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Card } from "@/features/game/engine/cards";
import {
  createInitialGame,
  DecisionContext,
  GameState,
  recommendPlay,
} from "@/features/game/engine/gameEngineDemo";
import { classifyPlay } from "@/features/game/engine/plays";
import { Result } from "@/features/game/engine/judgeResult";
import {
  useNetworkRoomGame,
  type RoomGatewayConnectionState,
} from "@/features/multiplayer";
import type { RoomSummary } from "@/features/multiplayer/types";

export interface ManualActionLogEntry {
  id: number;
  action: "PLAY" | "PASS" | "HINT";
  cards: Card[];
  playType?: string;
  contextType?: DecisionContext["type"];
  note?: string;
  timestamp: number;
}

interface UseNetworkGameStateOptions {
  humanPlayerIndex?: number;
  roomId?: string | null;
  roomLabel?: string;
  displayName?: string;
  autoFillAI?: boolean;
  aiNames?: string[];
  autoJoinManualPlayer?: boolean;
  onStateSummary?: (summary: RoomSummary) => void;
}

const MANUAL_HISTORY_LIMIT = 6;
const DEFAULT_ROOM_KEY = "network-room";

export interface NetworkGameStateResult {
  state: GameState;
  lastResult: Result | null;
  connectionState: RoomGatewayConnectionState;
  rooms: RoomSummary[];
  roomId: string | null;
  selectRoom: (roomId: string | null) => void;
  manualRequest: ReturnType<typeof useNetworkRoomGame>["manualRequest"];
  manualHistory: ManualActionLogEntry[];
  turn: number;
  handleRestart: () => void;
  handleStartNextRound: () => void;
  handleNextTurn: () => void;
  submitManualDecision: (cards: Card[] | null) => void;
  requestManualHint: () => Card[] | null;
  createRoom: ReturnType<typeof useNetworkRoomGame>["createRoom"];
  joinRoom: ReturnType<typeof useNetworkRoomGame>["joinRoom"];
  startGame: ReturnType<typeof useNetworkRoomGame>["startGame"];
  playTurns: (runUntilManual?: boolean) => void;
  manualPlayerIndex: number | null;
  manualPlayer: GameState["players"][number] | null;
}

export function useNetworkGameState(
  playerCount: number = 6,
  options?: UseNetworkGameStateOptions
): NetworkGameStateResult {
  const normalizedHumanIndex =
    typeof options?.humanPlayerIndex === "number"
      ? Math.min(
          Math.max(0, Math.floor(options.humanPlayerIndex)),
          playerCount - 1
        )
      : null;
  const hasManualPlayer = normalizedHumanIndex !== null;

  const placeholderWrapper = useMemo(() => {
    const playerNames =
      hasManualPlayer && normalizedHumanIndex !== null
        ? Array.from({ length: playerCount }, (_, idx) =>
            idx === normalizedHumanIndex ? "你" : `电脑${idx + 1}`
          )
        : undefined;
    return createInitialGame(playerCount, {
      playerNames,
    });
  }, [hasManualPlayer, normalizedHumanIndex, playerCount]);

  const placeholderState = placeholderWrapper.state;

  const displayName = options?.displayName ?? "你";
  const autoFillAI = options?.autoFillAI ?? true;
  const autoJoinManualPlayer = options?.autoJoinManualPlayer ?? true;
  const aiNamesInput = options?.aiNames;
  const aiNames = useMemo(() => {
    if (aiNamesInput) {
      return aiNamesInput;
    }
    return Array.from({ length: Math.max(0, playerCount - 1) }, (_, index) => {
      return `电脑（${index + 1}）`;
    });
  }, [aiNamesInput, playerCount]);

  const {
    connect,
    connectionState,
    rooms,
    activeRoomId,
    activeRoomSummary,
    activeRoomState,
    manualRequest,
    activeSession,
    createRoom,
    joinRoom,
    refreshRooms,
    startGame,
    playTurns: playTurnsCommand,
    submitManualDecision,
    selectRoom,
  } = useNetworkRoomGame({
    initialRoomId: options?.roomId ?? null,
    defaultDisplayName: displayName,
    defaultSessionKind: hasManualPlayer ? "MANUAL" : "AI",
  });

  const historyStoreRef = useRef<
    Map<string, { history: ManualActionLogEntry[]; nextId: number }>
  >(new Map());
  const turnStoreRef = useRef<Map<string, number>>(new Map());
  const setupRoomRef = useRef<Set<string>>(new Set());
  const historyIdRef = useRef(1);
  const baseRoomKey = options?.roomId ?? DEFAULT_ROOM_KEY;
  const currentRoomKey = activeRoomId ?? baseRoomKey;

  const [manualHistory, setManualHistory] = useState<ManualActionLogEntry[]>(
    () => {
      const entry = historyStoreRef.current.get(baseRoomKey);
      historyIdRef.current = entry?.nextId ?? 1;
      return entry?.history ?? [];
    }
  );
  const [turnState, setTurnState] = useState<number>(() => {
    return turnStoreRef.current.get(baseRoomKey) ?? 0;
  });

  const setTurn = useCallback(
    (value: number | ((prev: number) => number)) => {
      setTurnState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        turnStoreRef.current.set(currentRoomKey, next);
        return next;
      });
    },
    [currentRoomKey]
  );

  useEffect(() => {
    const storedHistory = historyStoreRef.current.get(currentRoomKey);
    if (storedHistory) {
      historyIdRef.current = storedHistory.nextId;
      setManualHistory(storedHistory.history);
    } else {
      historyStoreRef.current.set(currentRoomKey, { history: [], nextId: 1 });
      historyIdRef.current = 1;
      setManualHistory([]);
    }
  }, [currentRoomKey]);

  useEffect(() => {
    const storedTurn = turnStoreRef.current.get(currentRoomKey);
    if (storedTurn === undefined) {
      turnStoreRef.current.set(currentRoomKey, 0);
      setTurnState(0);
    } else {
      setTurnState(storedTurn);
    }
  }, [currentRoomKey]);

  const ensureRoomReady = useCallback(async (): Promise<string | null> => {
    await connect();
    let targetRoomId = activeRoomId;
    if (!targetRoomId) {
      targetRoomId = await createRoom({
        label: options?.roomLabel,
        maxPlayers: playerCount,
      });
    }
    if (!targetRoomId) return null;
    selectRoom(targetRoomId);
    if (!setupRoomRef.current.has(targetRoomId)) {
      if (hasManualPlayer && autoJoinManualPlayer) {
        await joinRoom({
          roomId: targetRoomId,
          kind: "MANUAL",
          displayName,
        });
      }
      if (autoFillAI) {
        const aiSeats = playerCount - (hasManualPlayer ? 1 : 0);
        for (let index = 0; index < aiSeats; index += 1) {
          const name = aiNames[index] ?? `AI ${index + 1}`;
          await joinRoom({
            roomId: targetRoomId,
            kind: "AI",
            displayName: name,
          });
        }
      }
      setupRoomRef.current.add(targetRoomId);
    }
    return targetRoomId;
  }, [
    activeRoomId,
    aiNames,
    autoFillAI,
    autoJoinManualPlayer,
    connect,
    createRoom,
    displayName,
    hasManualPlayer,
    joinRoom,
    options?.roomLabel,
    playerCount,
    selectRoom,
  ]);

  const startRoom = useCallback(async () => {
    try {
      const roomId = await ensureRoomReady();
      if (!roomId) return;
      await startGame(roomId);
    } catch (error) {
      console.warn("Failed to start network room", error);
    }
  }, [ensureRoomReady, startGame]);

  useEffect(() => {
    if (!autoJoinManualPlayer && !autoFillAI) {
      return;
    }
    startRoom();
  }, [autoFillAI, autoJoinManualPlayer, startRoom]);

  const playTurns = useCallback(
    async (runUntilManual: boolean = false) => {
      try {
        const roomId = await ensureRoomReady();
        if (!roomId) return;
        await playTurnsCommand({ roomId, runUntilManual });
      } catch (error) {
        console.warn("Failed to advance turns via network", error);
      }
    },
    [ensureRoomReady, playTurnsCommand]
  );

  const manualSessionId =
    manualRequest?.sessionId ?? activeSession?.id ?? null;

  const submitManual = useCallback(
    async (cards: Card[] | null) => {
      if (!manualSessionId) {
        throw new Error("No manual session available for decisions.");
      }
      try {
        const roomId = await ensureRoomReady();
        if (!roomId) return;
        await submitManualDecision(cards, { roomId, sessionId: manualSessionId });
      } catch (error) {
        console.warn("Failed to submit manual decision", error);
      }
    },
    [ensureRoomReady, manualSessionId, submitManualDecision]
  );

  const state = activeRoomState ?? placeholderState;
  const lastResult = activeRoomState?.result ?? null;

  const appendManualHistory = useCallback(
    (entry: Omit<ManualActionLogEntry, "id" | "timestamp">) => {
      setManualHistory((prev) => {
        const next: ManualActionLogEntry = {
          id: historyIdRef.current++,
          timestamp: Date.now(),
          ...entry,
        };
        const updated = [next, ...prev].slice(0, MANUAL_HISTORY_LIMIT);
        historyStoreRef.current.set(currentRoomKey, {
          history: updated,
          nextId: historyIdRef.current,
        });
        return updated;
      });
    },
    [currentRoomKey]
  );

  useEffect(() => {
    if (activeRoomState) {
      setTurn((prev) => prev + 1);
    }
  }, [activeRoomState, setTurn]);

  const handleNextTurn = useCallback(() => {
    if (state.gameOver) return;
    if (hasManualPlayer && manualRequest) return;
    playTurns(hasManualPlayer);
  }, [hasManualPlayer, manualRequest, playTurns, state.gameOver]);

  useEffect(() => {
    if (!hasManualPlayer) return;
    if (!state) return;
    if (state.gameOver) return;
    if (manualRequest) return;
    playTurns(true);
  }, [hasManualPlayer, manualRequest, playTurns, state]);

  const clearManualHistory = useCallback(() => {
    historyIdRef.current = 1;
    historyStoreRef.current.set(currentRoomKey, { history: [], nextId: 1 });
    setManualHistory([]);
  }, [currentRoomKey]);

  const handleRestart = useCallback(() => {
    clearManualHistory();
    setTurn(0);
    if (activeRoomId) {
      setupRoomRef.current.delete(activeRoomId);
    }
    startRoom();
  }, [activeRoomId, clearManualHistory, setTurn, startRoom]);

  const handleStartNextRound = useCallback(() => {
    handleRestart();
  }, [handleRestart]);

  const manualPlayerIndex = normalizedHumanIndex;
  const manualPlayer =
    manualPlayerIndex !== null ? state.players[manualPlayerIndex] ?? null : null;

  const submitManualDecisionHandler = useCallback(
    (cards: Card[] | null) => {
      if (!hasManualPlayer) return;
      const snapshot = cards ? cards.map((card) => ({ ...card })) : [];
      const classified = cards ? classifyPlay(cards) : null;
      const action =
        cards && cards.length > 0 ? ("PLAY" as const) : ("PASS" as const);
      appendManualHistory({
        action,
        cards: snapshot,
        playType: classified?.type,
        contextType: manualRequest?.request?.context.type,
        note:
          action === "PASS"
            ? "选择 PASS"
            : classified
            ? undefined
            : "自由出牌",
      });
      submitManual(cards);
    },
    [appendManualHistory, hasManualPlayer, manualRequest?.request?.context.type, submitManual]
  );

  const requestManualHint = useCallback(() => {
    if (normalizedHumanIndex === null) return null;
    const context: DecisionContext =
      manualRequest?.request?.context ?? { type: "TURN" };
    const recommendation = recommendPlay(state, normalizedHumanIndex, context);
    if (recommendation) {
      appendManualHistory({
        action: "HINT",
        cards: recommendation.map((card) => ({ ...card })),
        playType: classifyPlay(recommendation)?.type,
        contextType: context.type,
        note: "请求智能提示",
      });
    } else {
      appendManualHistory({
        action: "HINT",
        cards: [],
        contextType: context.type,
        note: "提示建议 PASS",
      });
    }
    return recommendation;
  }, [appendManualHistory, manualRequest?.request?.context, normalizedHumanIndex, state]);

  useEffect(() => {
    if (!options?.onStateSummary) return;
    const manualHistorySnapshot = manualHistory.map(
      ({ id, action, note, timestamp }) => ({
        id,
        action,
        note,
        timestamp,
      })
    );
    const summary: RoomSummary = {
      id: currentRoomKey,
      status: activeRoomSummary?.status ?? "WAITING",
      playerCount: state.players.length,
      maxPlayers: playerCount,
      finishCount: state.finishCount,
      gameOver: state.gameOver,
      waitingForManual: Boolean(manualRequest),
      currentPlayerName:
        state.players[state.currentPlayerIndex]?.name ?? undefined,
      manualHistory: manualHistorySnapshot,
      lastUpdated: Date.now(),
    };
    options.onStateSummary(summary);
  }, [
    activeRoomSummary?.status,
    currentRoomKey,
    manualHistory,
    manualRequest,
    options,
    state,
  ]);

  return {
    state,
    lastResult,
    connectionState,
    rooms,
    roomId: activeRoomId ?? null,
    manualRequest,
    manualHistory,
    turn: turnState,
    handleRestart,
    handleStartNextRound,
    handleNextTurn,
    submitManualDecision: submitManualDecisionHandler,
    requestManualHint,
    selectRoom,
    createRoom,
    joinRoom,
    refreshRooms,
    startGame,
    playTurns,
    manualPlayerIndex,
    manualPlayer,
  };
}
