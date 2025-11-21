// src/features/game/hooks/useGameState.ts
import { useCallback, useEffect, useRef, useState } from "react";

import { Card } from "../engine/cards";
import {
  Camp,
  createInitialGame,
  DecisionContext,
  GameEngine,
  GameState,
} from "../engine/gameEngineDemo";
import { judgeResult, PlayerFinish } from "../engine/judgeResult";
import { canBeat, classifyPlay } from "../engine/plays";

const DEFAULT_PLAYER_COUNT = 6;

// 人类玩家的决策接口
export interface ManualDecisionNeeded {
  playerIndex: number;
  type: "TURN" | "REACT";
}

/**
 * 统一的游戏状态管理 Hook
 * - 使用完整的 gameEngineDemo 引擎
 * - 支持手动玩家和 AI 混合对局
 */
export function useGameState(playerCount = DEFAULT_PLAYER_COUNT) {
  const [state, setState] = useState<GameState | null>(null);
  const [pendingManual, setPendingManual] =
    useState<ManualDecisionNeeded | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  /** 启动 / 重开一局 */
  const startNewGame = useCallback(() => {
    // 创建决策控制器：P1 是人类，等待手动输入；其他都是 AI
    const controllers: Record<string, any> = {};

    // P1 的决策函数：返回 null 表示需要等待用户输入
    controllers["P1"] = (
      state: GameState,
      playerIndex: number,
      context: DecisionContext
    ): Card[] | null => {
      // 通知 UI 需要手动输入
      setPendingManual({
        playerIndex,
        type: context.type as "TURN" | "REACT",
      });

      // 这里需要同步等待，但实际上我们会在外部调用时处理
      // 暂时返回 null（PASS），实际会通过 playCards/pass 来推进
      return null;
    };

    const { engine, state: initialState } = createInitialGame(playerCount, {
      controllers,
    });

    engineRef.current = engine;
    setState(initialState);

    // 检查第一个玩家是否是人类
    if (initialState.currentPlayerIndex === 0 && !initialState.gameOver) {
      setPendingManual({
        playerIndex: 0,
        type: initialState.lastPlay ? "REACT" : "TURN",
      });
    } else {
      setPendingManual(null);
      // 如果第一个不是人类，开始自动执行 AI 回合
      runUntilManualNeeded(engine);
    }
  }, [playerCount]);

  // 自动执行 AI 回合直到需要人类输入或游戏结束
  const runUntilManualNeeded = (engine: GameEngine) => {
    const state = engine.state;

    while (!state.gameOver) {
      const currentPlayer = state.players[state.currentPlayerIndex];

      // 如果当前玩家是 P1（人类玩家），停止并等待输入
      if (currentPlayer.id === "P1" && !currentPlayer.finished) {
        setPendingManual({
          playerIndex: state.currentPlayerIndex,
          type: state.lastPlay ? "REACT" : "TURN",
        });
        // 创建新的状态对象以确保React检测到变化（深拷贝players）
        setState({ 
          ...state, 
          players: state.players.map(p => ({ ...p, hand: [...p.hand] }))
        });
        return;
      }

      // 否则执行 AI 回合
      engine.playAutoTurn();

      // 🔄 每次AI出牌后，立即更新UI状态
      // 创建新的状态对象以确保React检测到变化（深拷贝players）
      setState({ 
        ...state, 
        players: state.players.map(p => ({ ...p, hand: [...p.hand] }))
      });

      // 防止无限循环
      if (state.gameOver) {
        setPendingManual(null);
        console.log("🎮 游戏结束，最终状态更新:", {
          gameOver: state.gameOver,
          result: state.result,
        });
        // ✅ 游戏结束时，强制创建新对象以触发React更新（深拷贝players）
        setState({
          ...state,
          players: state.players.map(p => ({ ...p, hand: [...p.hand] })),
          result: state.result ? { ...state.result } : null,
        });
        return;
      }
    }

    setPendingManual(null);
    setState({ 
      ...state, 
      players: state.players.map(p => ({ ...p, hand: [...p.hand] }))
    });
  };

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // 移动到下一个活跃玩家
  const moveToNextPlayer = useCallback(
    (state: GameState, fromIndex: number) => {
      const n = state.players.length;
      let nextIndex = (fromIndex - 1 + n) % n; // 逆时针
      while (state.players[nextIndex].finished) {
        nextIndex = (nextIndex - 1 + n) % n;
      }
      state.currentPlayerIndex = nextIndex;
    },
    []
  );

  // 结算游戏
  const settleGame = useCallback((state: GameState) => {
    state.gameOver = true;

    const finishes: PlayerFinish[] = state.players
      .filter((p) => p.finishOrder != null)
      .sort((a, b) => a.finishOrder! - b.finishOrder!)
      .map((p) => ({
        id: p.id,
        camp: p.camp,
      }));

    // 先让 judgeResult 只帮我们算 winner
    const baseResult = judgeResult(finishes);

    // 然后根据「当前还没出完的玩家」重算 caught
    let winner = baseResult.winner;
    let caught: string[] = [];

    if (winner === "A" || winner === "B") {
      const loserCamp: Camp = winner === "A" ? "B" : "A";
      // 输的一方阵营中：所有还没出完的玩家 = 被抓
      caught = state.players
        .filter((p) => p.camp === loserCamp && !p.finished)
        .map((p) => p.id);
    }

    state.result = { winner, caught };

    // 输出详细的结算信息
    console.log("\n" + "=".repeat(50));
    console.log("🏁 游戏结束 - 本局结算");
    console.log("=".repeat(50));

    console.log("\n📊 出完顺序：");
    for (const p of state.players.sort(
      (a, b) => (a.finishOrder ?? 999) - (b.finishOrder ?? 999)
    )) {
      const finishInfo = p.finishOrder
        ? ` 第 ${p.finishOrder} 个出完`
        : " 未出完";
      const caughtMark = caught.includes(p.id) ? " ❌ 被抓" : "";
      console.log(`- ${p.name}（${p.camp} 阵营）${finishInfo}${caughtMark}`);
    }

    console.log("\n" + "-".repeat(50));
    if (state.result.winner === "DRAW") {
      console.log(`🏆 本局结果：平局 🤝`);
    } else {
      console.log(`🏆 本局结果：${state.result.winner} 阵营胜利！🎉`);
    }

    if (state.result.caught.length > 0) {
      console.log("\n⚠️  被抓玩家详情：");
      const caughtPlayerNames = state.players
        .filter((p) => caught.includes(p.id))
        .map((p) => `${p.name}（${p.camp} 阵营）`);
      caughtPlayerNames.forEach((name, index) => {
        console.log(`   ${index + 1}. ${name}`);
      });
      console.log(`\n   共 ${state.result.caught.length} 名玩家被抓`);
    } else {
      console.log("\n✅ 本局没有玩家被抓");
    }
    console.log("=".repeat(50) + "\n");
  }, []);

  // 处理玩家出完牌的逻辑
  const handlePlayerFinished = useCallback(
    (state: GameState, playerIndex: number, engine: GameEngine) => {
      const player = state.players[playerIndex];

      player.finished = true;
      player.finishOrder = ++state.finishCount;
      console.log(
        `🎉 ${player.name} 已出完所有手牌！（第 ${player.finishOrder} 位）`
      );

      // 检查某个阵营是否已经"全员出完"
      const campOfP = player.camp;
      const allThisCampFinished = state.players
        .filter((pl) => pl.camp === campOfP)
        .every((pl) => pl.finished);

      if (allThisCampFinished) {
        console.log(
          `\n🏁 阵营 ${campOfP} 的玩家全部出完，游戏立即结束并结算胜负。`
        );
        settleGame(state);
        return;
      }

      // 检查所有人是否都出完
      const allFinished = state.players.every((pl) => pl.finished);
      if (allFinished) {
        console.log("\n🏁 所有玩家都已出完，进入结算...");
        settleGame(state);
        return;
      }

      // ⭐ 有人出完但游戏未结束：移动到下一个玩家
      // 注意：这里简化了"追问"逻辑，直接移动到下一个玩家
      // AI玩家会通过 runUntilManualNeeded → playAutoTurn 自动决策是否要管
      // 人类玩家会在 runUntilManualNeeded 中被检测到，设置 pendingManual
      // 这与引擎的 askOthersWhetherToBeat 逻辑略有不同，但能保证游戏正常进行
      moveToNextPlayer(state, playerIndex);
    },
    [settleGame, moveToNextPlayer]
  );

  const playCards = useCallback(
    (cards: Card[]) => {
      const engine = engineRef.current;
      if (!engine || !pendingManual) return;

      const state = engine.state;
      const player = state.players[pendingManual.playerIndex];

      // 验证是否是 TURN 阶段
      const isTurn = !state.lastPlay;
      if (isTurn && (!cards || cards.length === 0)) {
        console.warn("TURN 阶段必须出牌");
        return;
      }

      console.log(
        `🎴 ${player.name} 尝试出牌:`,
        cards.map((c) => `${c.rank}${c.suit}`).join(" ")
      );

      // 1️⃣ 识别牌型
      const play = classifyPlay(cards);
      if (!play) {
        console.log(`❌ ${player.name} 打出的牌型无效`);
        return;
      }

      console.log(
        `🎴 ${player.name} 牌型识别为: ${play.type}, mainValue=${play.mainValue}`
      );

      // 2️⃣ 验证能否压住桌面的牌
      if (state.lastPlay && !canBeat(state.lastPlay, play)) {
        console.log(
          `❌ ${player.name} 的 ${play.type} 无法压住桌面的 ${state.lastPlay.type}`
        );
        return;
      }

      // 3️⃣ 从手牌中移除这些牌
      const cardIds = new Set(cards.map((c) => c.id));
      player.hand = player.hand.filter((c) => !cardIds.has(c.id));

      // 4️⃣ 更新游戏状态
      state.lastPlay = play;
      state.lastPlayOwnerIndex = pendingManual.playerIndex;
      state.passesInRound = 0;

      console.log(`✅ ${player.name} 出牌成功: ${play.type}`);
      console.log(
        `📋 桌面牌型已更新: ${state.lastPlay.type}, mainValue=${state.lastPlay.mainValue}`
      );

      // 5️⃣ 检查是否出完
      if (player.hand.length === 0) {
        handlePlayerFinished(state, pendingManual.playerIndex, engine);
      } else {
        // 6️⃣ 没出完 → 移动到下一个玩家
        moveToNextPlayer(state, pendingManual.playerIndex);
      }

      setPendingManual(null);
      // 创建新的状态对象以确保React检测到变化（深拷贝players）
      setState({
        ...state,
        players: state.players.map(p => ({ ...p, hand: [...p.hand] })),
        result: state.result ? { ...state.result } : null,
      });

      // 继续执行 AI 回合
      if (!state.gameOver) {
        setTimeout(() => runUntilManualNeeded(engine), 100);
      }
    },
    [pendingManual, handlePlayerFinished, moveToNextPlayer]
  );

  const pass = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !pendingManual) return;

    const state = engine.state;
    const player = state.players[pendingManual.playerIndex];

    // 验证是否允许 PASS
    if (!state.lastPlay) {
      console.warn("TURN 阶段不能 PASS");
      return;
    }

    console.log(`🕳️ ${player.name} 选择 PASS`);

    // 1️⃣ 增加 PASS 计数
    state.passesInRound += 1;

    // 2️⃣ 计算活跃玩家数量
    const activeCount = state.players.filter((p) => !p.finished).length;
    const othersCount = Math.max(activeCount - 1, 0);

    // 3️⃣ 检查是否所有其他玩家都 PASS 了
    if (
      state.lastPlay &&
      state.lastPlayOwnerIndex !== null &&
      othersCount > 0 &&
      state.passesInRound >= othersCount
    ) {
      console.log(`⚪ 本轮其他玩家全部 PASS，本墩结束并清空桌面`);

      // 清空桌面，控制权回到最后出牌的人
      const newStarter = state.lastPlayOwnerIndex;
      state.lastPlay = null;
      state.lastPlayOwnerIndex = null;
      state.passesInRound = 0;
      state.currentPlayerIndex = newStarter;

      console.log(
        `🔄 新一轮开始，由 ${state.players[newStarter].name} 首家出牌`
      );
    } else {
      // 4️⃣ 移动到下一个活跃玩家
      moveToNextPlayer(state, pendingManual.playerIndex);
    }

    setPendingManual(null);
    // 创建新的状态对象以确保React检测到变化（深拷贝players）
    setState({
      ...state,
      players: state.players.map(p => ({ ...p, hand: [...p.hand] })),
      result: state.result ? { ...state.result } : null,
    });

    // 继续执行 AI 回合
    if (!state.gameOver) {
      setTimeout(() => runUntilManualNeeded(engine), 100);
    }
  }, [pendingManual, moveToNextPlayer]);

  return {
    // 状态给 UI 用
    state,
    pendingManual,
    currentPlayerIndex: state?.currentPlayerIndex ?? 0,

    // 操作
    playCards,
    pass,
    restart: startNewGame,
  };
}
