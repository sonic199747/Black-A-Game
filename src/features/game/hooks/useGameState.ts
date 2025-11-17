import { Card } from "@/features/game/engine/cards";
import {
  createInitialGame,
  DecisionContext,
  GameState,
  recommendPlay,
} from "@/features/game/engine/gameEngineDemo";
import {
  ManualDecisionController,
  ManualDecisionNeeded,
  ManualDecisionRequest,
} from "@/features/game/engine/manualController";
import { classifyPlay } from "@/features/game/engine/plays";
import { useCallback, useEffect, useRef, useState } from "react";

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

/**
 * 游戏状态管理 Hook
 * 处理所有游戏相关的状态和逻辑
 */
interface UseGameStateOptions {
  humanPlayerIndex?: number;
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

  const manualControllerRef = useRef<ManualDecisionController | null>(null);
  const [pendingManualRequest, setPendingManualRequest] =
    useState<ManualDecisionRequest | null>(null);
  const historyIdRef = useRef(1);
  const [manualHistory, setManualHistory] = useState<ManualActionLogEntry[]>(
    []
  );

  const appendManualHistory = useCallback(
    (entry: Omit<ManualActionLogEntry, "id" | "timestamp">) => {
      setManualHistory((prev) => {
        const next: ManualActionLogEntry = {
          id: historyIdRef.current++,
          timestamp: Date.now(),
          ...entry,
        };
        return [next, ...prev].slice(0, MANUAL_HISTORY_LIMIT);
      });
    },
    []
  );

  const buildGame = useCallback(() => {
    const manualController = hasManualPlayer
      ? new ManualDecisionController()
      : null;

    const controllers =
      manualController && normalizedHumanIndex !== null
        ? {
            [`P${normalizedHumanIndex + 1}`]: manualController.getDecisionFn(),
          }
        : undefined;

    const playerNames =
      hasManualPlayer && normalizedHumanIndex !== null
        ? Array.from({ length: playerCount }, (_, idx) =>
            idx === normalizedHumanIndex ? "你" : `电脑${idx + 1}`
          )
        : undefined;

    const wrapper = createInitialGame(playerCount, {
      controllers,
      playerNames,
    });

    manualControllerRef.current = manualController;
    return wrapper;
  }, [hasManualPlayer, normalizedHumanIndex, playerCount]);

  const [engineWrapper, setEngineWrapper] = useState(() => buildGame());
  const [state, setState] = useState<GameState>(engineWrapper.state);
  const [turn, setTurn] = useState(0);

  const engine = engineWrapper.engine;
  const currentPlayer =
    state.players[state.currentPlayerIndex] ?? state.players[0];

  const playTurns = useCallback(
    (runUntilManual: boolean) => {
      const engine = engineWrapper.engine;

      // 使用 engine.state 而不是 state，避免闭包过期问题
      if (engine.state.gameOver) {
        return;
      }

      let turnsPlayed = 0;

      while (!engine.state.gameOver) {
        try {
          engine.playAutoTurn();
          turnsPlayed += 1;
        } catch (error) {
          if (error instanceof ManualDecisionNeeded) {
            setPendingManualRequest(error.request);
            break;
          }
          throw error;
        }

        if (!runUntilManual) {
          break;
        }
      }

      if (turnsPlayed > 0) {
        setTurn((t) => t + turnsPlayed);
      }
      // 确保创建新的对象引用，包括 hand 数组，让 React 检测到状态变化
      setState({
        ...engine.state,
        players: engine.state.players.map((p) => ({
          ...p,
          hand: [...p.hand],
        })),
      });
    },
    [engineWrapper.engine]
  );

  /**
   * 重新开局
   */
  const handleRestart = useCallback(() => {
    const next = buildGame();
    setEngineWrapper(next);
    setState(next.state);
    setTurn(0);
    setManualHistory([]);
    historyIdRef.current = 1;
    setPendingManualRequest(null);
  }, [buildGame]);

  /**
   * 执行下一回合
   */
  const handleNextTurn = useCallback(() => {
    if (engineWrapper.engine.state.gameOver) return;
    if (hasManualPlayer && pendingManualRequest) return;

    playTurns(hasManualPlayer);
  }, [engineWrapper.engine, hasManualPlayer, pendingManualRequest, playTurns]);

  /**
   * 真人在 UI 中给出决策（出牌或 PASS）
   */
  const submitManualDecision = useCallback(
    (cards: Card[] | null) => {
      if (!manualControllerRef.current) return;
      if (hasManualPlayer) {
        const snapshot = cards ? cards.map((card) => ({ ...card })) : [];
        const classified = cards ? classifyPlay(cards) : null;
        const action =
          cards && cards.length > 0 ? ("PLAY" as const) : ("PASS" as const);
        appendManualHistory({
          action,
          cards: snapshot,
          playType: classified?.type,
          contextType: pendingManualRequest?.context.type,
          note:
            action === "PASS"
              ? "选择 PASS"
              : classified
              ? undefined
              : "自由出牌",
        });
      }
      manualControllerRef.current.submitDecision(cards);
      setPendingManualRequest(null);
      playTurns(true);
    },
    [appendManualHistory, hasManualPlayer, pendingManualRequest, playTurns]
  );

  const requestManualHint = useCallback(() => {
    if (normalizedHumanIndex === null) return null;
    const context: DecisionContext = pendingManualRequest?.context ?? {
      type: "TURN",
    };
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
  }, [appendManualHistory, normalizedHumanIndex, pendingManualRequest, state]);

  useEffect(() => {
    if (!hasManualPlayer) return;
    if (engineWrapper.state.gameOver) return;
    if (manualControllerRef.current?.pendingRequest) return;

    playTurns(true);
  }, [engineWrapper, hasManualPlayer, playTurns]);

  return {
    state,
    turn,
    engine,
    currentPlayer,
    players: state.players,
    handleRestart,
    handleNextTurn,
    manualRequest: pendingManualRequest,
    submitManualDecision,
    requestManualHint,
    isManualMode: hasManualPlayer,
    manualPlayerIndex: normalizedHumanIndex,
    manualHistory,
    manualPlayer:
      normalizedHumanIndex !== null
        ? state.players[normalizedHumanIndex]
        : null,
  };
}
