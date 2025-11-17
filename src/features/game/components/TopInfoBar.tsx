import { GameState } from "@/features/game/engine/gameEngineDemo";
import React from "react";
import { Text, View } from "react-native";
import { homeStyles } from "../styles/homeStyles";

interface TopInfoBarProps {
  state: GameState;
  turn: number;
  playerCount: number;
}

/**
 * 顶部信息栏组件
 * 显示游戏标题和快速统计信息
 */
export function TopInfoBar({ state, turn, playerCount }: TopInfoBarProps) {
  const finishedCount = state.players.filter((p) => p.finished).length;

  return (
    <View style={homeStyles.titleSection}>
      <Text style={homeStyles.title}>🎮 抓黑A</Text>
      <Text style={homeStyles.subtitle}>团队对战 · 6人桌面</Text>

      <View style={homeStyles.gameInfoRow}>
        <View style={homeStyles.infoBox}>
          <Text style={homeStyles.infoBoxLabel}>轮数</Text>
          <Text style={homeStyles.infoBoxValue}>{turn}</Text>
        </View>
        <View style={homeStyles.infoBox}>
          <Text style={homeStyles.infoBoxLabel}>进度</Text>
          <Text style={homeStyles.infoBoxValue}>
            {finishedCount}/{playerCount}
          </Text>
        </View>
        <View style={homeStyles.infoBox}>
          <Text style={homeStyles.infoBoxLabel}>状态</Text>
          <Text
            style={[
              homeStyles.infoBoxValue,
              state.gameOver && homeStyles.gameOverStatus,
            ]}
          >
            {state.gameOver ? "已结束" : "进行中"}
          </Text>
        </View>
      </View>
    </View>
  );
}
