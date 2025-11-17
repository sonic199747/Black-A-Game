import {
  ControlButtons,
  GameResultPanel,
  GameStatusPanel,
  SixPlayerTableLayout,
  TopInfoBar,
  homeStyles,
  useGameState,
} from "@/features/game";
import type { ManualPlayerPanelProps } from "@/features/game/components/ManualPlayerPanel";
import React from "react";
import { ScrollView, Text, View } from "react-native";
const PLAYER_COUNT = 6;

/**
 * 主屏幕组件 - 游戏主界面
 *
 * 结构：
 * 1. TopInfoBar - 游戏标题和快速统计
 * 2. ControlButtons - 重新开局和下一回合按钮
 * 3. GameStatusPanel - 实时游戏状态
 * 4. GameResultPanel - 游戏结束结算（条件渲染）
 * 5. TableLayout - 6人座位布局
 */
export default function HomeScreen() {
  // ===== 游戏状态管理 =====
  const {
    state,
    engine,
    players,
    handleRestart,
    handleNextTurn,
    manualRequest,
    submitManualDecision,
    manualPlayer,
    manualPlayerIndex,
    isManualMode,
    requestManualHint,
    manualHistory,
  } = useGameState(PLAYER_COUNT, { humanPlayerIndex: 0 });

  const waitingForManual = Boolean(manualRequest);
  const triggerPlayerName =
    manualRequest?.context.triggerPlayerIndex !== undefined
      ? players[manualRequest.context.triggerPlayerIndex]?.name
      : undefined;

  const mustBeatCurrent =
    Boolean(state.lastPlay) &&
    manualPlayerIndex !== null &&
    Boolean(
      manualRequest?.context.type === "REACT" ||
        state.lastPlayOwnerIndex !== manualPlayerIndex
    );

  const manualPanelProps: ManualPlayerPanelProps | null = manualPlayer
    ? {
        player: manualPlayer,
        request: manualRequest,
        lastPlay: state.lastPlay,
        mustBeatCurrent,
        triggerPlayerName,
        history: manualHistory,
        onSubmit: (cards) => submitManualDecision(cards),
        onPass: () => submitManualDecision(null),
        onHintRequest: requestManualHint,
      }
    : null;

  return (
    <ScrollView
      style={homeStyles.container}
      contentContainerStyle={homeStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ===== 顶部信息栏 ===== */}
      <TopInfoBar />

      {/* ===== 控制按钮 ===== */}
      <ControlButtons
        gameOver={state.gameOver}
        onRestart={handleRestart}
        onNextTurn={handleNextTurn}
        isManualMode={isManualMode}
        waitingForManual={waitingForManual}
      />

      {/* ===== 游戏状态面板 ===== */}
      <GameStatusPanel state={state} />

      {/* ===== 游戏结算面板（游戏结束时显示）===== */}
      {state.gameOver && (
        <GameResultPanel result={engine.lastResult} players={players} />
      )}

      {/* ===== 座位布局 ===== */}
      <View style={homeStyles.tableSection}>
        <Text style={homeStyles.tableTitle}>👥 座位布局</Text>
        <SixPlayerTableLayout
          players={players}
          currentPlayerIndex={state.currentPlayerIndex} // 如果 state 里有这个字段
          selfIndex={0} // 你现在人类玩家就是 index 0
          manualPanelProps={manualPanelProps}
          lastPlay={state.lastPlay}
          lastPlayOwnerName={
            state.lastPlayOwnerIndex !== null
              ? players[state.lastPlayOwnerIndex]?.name
              : undefined
          }
        />
      </View>

      {/* ===== 底部间距 ===== */}
      <View style={homeStyles.bottomSpacer} />
    </ScrollView>
  );
}
