import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Card } from "@/features/game/engine/cards";
import {
  createInitialGame,
  DecisionContext,
  GameState,
  PreviousRoundSnapshot,
  recommendPlay,
} from "@/features/game/engine/gameEngineDemo";
import { classifyPlay } from "@/features/game/engine/plays";
import { useLocalRoomGame, type RoomManager } from "@/features/multiplayer";
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

const MANUAL_HISTORY_LIMIT = 6;

interface UseGameStateOptions {
  humanPlayerIndex?: number;
  roomKey?: string;
  manager?: RoomManager;
  roomLabel?: string;
  onStateSummary?: (summary: RoomSummary) => void;
}

export function useGameState(
  playerCount: number = 6,
  options?: UseGameStateOptions
) {
  const normalizedHumanIndex =
    typeof options?.humanPlayerIndex === "number"
      ? Math.min(
          Math.max(0, Math.floor(options.humanPlayerIndex)),
          playerCount - 1
        )
      : null;
  const hasManualPlayer = normalizedHumanIndex !== null;
  const roomKey = options?.roomKey ?? "default-room";

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
  const placeholderEngine = placeholderWrapper.engine;

  const {
    state: roomState,
    room,
    manualRequest,
    manualSession,
    playTurns: roomPlayTurns,
    submitManualDecision: roomSubmitDecision,
    startRoom,
    startRoomWithSnapshot,
    resetRoom,
  } = useLocalRoomGame({
    maxPlayers: playerCount,
    manualSeatIndex: normalizedHumanIndex,
    manager: options?.manager,
    roomId: roomKey,
    label: options?.roomLabel,
  });

  const state = roomState ?? placeholderState;
  const engine = room?.engine ?? placeholderEngine;

  const historyIdRef = useRef(1);
  const historyStoreRef = useRef<
    Map<string, { history: ManualActionLogEntry[]; nextId: number }>
  >(new Map());
  const turnStoreRef = useRef<Map<string, number>>(new Map());
  const [manualHistory, setManualHistory] = useState<ManualActionLogEntry[]>(() => {
    const entry = historyStoreRef.current.get(roomKey);
    historyIdRef.current = entry?.nextId ?? 1;
    return entry?.history ?? [];
  });
  const [turnState, setTurnState] = useState<number>(() => {
    return turnStoreRef.current.get(roomKey) ?? 0;
  });

  const setTurn = useCallback(
    (value: number | ((prev: number) => number)) => {
      setTurnState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        turnStoreRef.current.set(roomKey, next);
        return next;
      });
    },
    [roomKey]
  );

  const appendManualHistory = useCallback(
    (entry: Omit<ManualActionLogEntry, "id" | "timestamp">) => {
      setManualHistory((prev) => {
        const next: ManualActionLogEntry = {
          id: historyIdRef.current++,
          timestamp: Date.now(),
          ...entry,
        };
        const updated = [next, ...prev].slice(0, MANUAL_HISTORY_LIMIT);
        historyStoreRef.current.set(roomKey, {
          history: updated,
          nextId: historyIdRef.current,
        });
        return updated;
      });
    },
    [roomKey]
  );

  useLayoutEffect(() => {
    if (!room) {
      startRoom();
    }
  }, [room, startRoom]);

  useEffect(() => {
    const storedHistory = historyStoreRef.current.get(roomKey);
    if (storedHistory) {
      historyIdRef.current = storedHistory.nextId;
      setManualHistory(storedHistory.history);
    } else {
      historyIdRef.current = 1;
      historyStoreRef.current.set(roomKey, { history: [], nextId: 1 });
      setManualHistory([]);
    }
  }, [roomKey]);

  useEffect(() => {
    const storedTurn = turnStoreRef.current.get(roomKey);
    if (storedTurn === undefined) {
      turnStoreRef.current.set(roomKey, 0);
      setTurnState(0);
    } else {
      setTurnState(storedTurn);
    }
  }, [roomKey]);

  useEffect(() => {
    const summaryCallback = options?.onStateSummary;
    if (!summaryCallback) return;
    const manualHistorySnapshot = manualHistory.map(
      ({ id, action, note, timestamp }) => ({
        id,
        action,
        note,
        timestamp,
      })
    );
    const summary: RoomSummary = {
      id: roomKey,
      status: room?.currentStatus ?? "WAITING",
      playerCount: state.players.length,
      finishCount: state.finishCount,
      gameOver: state.gameOver,
      waitingForManual: Boolean(manualRequest),
      currentPlayerName:
        state.players[state.currentPlayerIndex]?.name ?? undefined,
      manualHistory: manualHistorySnapshot,
      lastUpdated: Date.now(),
    };
    summaryCallback(summary);
  }, [
    manualHistory,
    manualRequest,
    options?.onStateSummary,
    room?.currentStatus,
    roomKey,
    state,
  ]);

  useEffect(() => {
    if (roomState) {
      setTurn((prev) => prev + 1);
    }
  }, [roomState, setTurn]);

  const playTurns = useCallback(
    (runUntilManual: boolean) => {
      if (!room) return;
      if (roomState?.gameOver) return;
      roomPlayTurns(runUntilManual);
    },
    [room, roomPlayTurns, roomState]
  );

  const handleNextTurn = useCallback(() => {
    if (state.gameOver) return;
    if (hasManualPlayer && manualRequest) return;
    playTurns(hasManualPlayer);
  }, [hasManualPlayer, manualRequest, playTurns, state.gameOver]);

  const buildSnapshot = useCallback((): PreviousRoundSnapshot | null => {
    if (!roomState) return null;
    const lastResult = room?.lastResult ?? null;
    if (!lastResult) return null;
    const previousPlayers: PreviousRoundSnapshot["players"] =
      roomState.players.map((player) => ({
        id: player.id,
        name: player.name,
        camp: player.camp,
      }));
    if (previousPlayers.length === 0) return null;
    return { result: lastResult, players: previousPlayers };
  }, [room, roomState]);

  const clearManualHistory = useCallback(() => {
    historyIdRef.current = 1;
    historyStoreRef.current.set(roomKey, { history: [], nextId: 1 });
    setManualHistory([]);
  }, [roomKey]);

  const handleRestart = useCallback(() => {
    resetRoom({ removeRoom: true });
    clearManualHistory();
    setTurn(0);
    startRoom();
  }, [clearManualHistory, resetRoom, setTurn, startRoom]);

  const handleStartNextRound = useCallback(() => {
    const snapshot = buildSnapshot();
    resetRoom({ removeRoom: true });
    clearManualHistory();
    setTurn(0);
    startRoomWithSnapshot(snapshot);
  }, [buildSnapshot, clearManualHistory, resetRoom, setTurn, startRoomWithSnapshot]);

  const submitManualDecision = useCallback(
    (cards: Card[] | null) => {
      if (!manualSession) return;
      if (!hasManualPlayer) return;
      const snapshot = cards ? cards.map((card) => ({ ...card })) : [];
      const classified = cards ? classifyPlay(cards) : null;
      const action =
        cards && cards.length > 0 ? ("PLAY" as const) : ("PASS" as const);
      appendManualHistory({
        action,
        cards: snapshot,
        playType: classified?.type,
        contextType: manualRequest?.context.type,
        note:
          action === "PASS"
            ? "选择 PASS"
            : classified
            ? undefined
            : "自由出牌",
      });
      roomSubmitDecision(cards, manualSession.id);
    },
    [
      appendManualHistory,
      hasManualPlayer,
      manualRequest,
      manualSession,
      roomSubmitDecision,
    ]
  );

  const requestManualHint = useCallback(() => {
    if (normalizedHumanIndex === null) return null;
    const context: DecisionContext = manualRequest?.context ?? { type: "TURN" };
    const liveState = roomState ?? state;
    const recommendation = recommendPlay(liveState, normalizedHumanIndex, context);
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
  }, [
    appendManualHistory,
    manualRequest,
    normalizedHumanIndex,
    roomState,
    state,
  ]);

  useEffect(() => {
    if (!hasManualPlayer) return;
    if (!room) return;
    if (!roomState) return;
    if (roomState.gameOver) return;
    if (manualRequest) return;
    roomPlayTurns(true);
  }, [hasManualPlayer, manualRequest, room, roomPlayTurns, roomState]);

  const lastRoomKeyRef = useRef(roomKey);
  useEffect(() => {
    if (lastRoomKeyRef.current === roomKey) return;
    lastRoomKeyRef.current = roomKey;
    handleRestart();
  }, [handleRestart, roomKey]);

  const manualPlayerIndex =
    manualSession?.seatIndex ?? normalizedHumanIndex ?? null;

  return {
    state,
    turn: turnState,
    engine,
    currentPlayer:
      state.players[state.currentPlayerIndex] ?? state.players[0],
    players: state.players,
    handleRestart,
    handleStartNextRound,
    handleNextTurn,
    manualRequest,
    submitManualDecision,
    requestManualHint,
    isManualMode: hasManualPlayer,
    manualPlayerIndex,
    manualHistory,
    manualPlayer:
      manualPlayerIndex !== null ? state.players[manualPlayerIndex] ?? null : null,
  };
}
