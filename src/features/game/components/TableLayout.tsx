import { PlayerState } from "@/features/game/engine/gameEngineDemo";
import React from "react";
import { Text, View } from "react-native";
import { homeStyles } from "../styles/homeStyles";
import { PlayerCard } from "./PlayerCard";

interface TableLayoutProps {
  players: PlayerState[];
  currentPlayer: PlayerState | undefined;
}

/**
 * 6人座位布局组件
 * 显示圆桌形的座位安排
 */
export function TableLayout({ players, currentPlayer }: TableLayoutProps) {
  if (players.length !== 6) {
    return (
      <Text style={homeStyles.fallbackText}>
        当前仅支持 6 人桌面，玩家数 = {players.length}
      </Text>
    );
  }

  return (
    <View style={homeStyles.tableContainer}>
      {/* 顶部座位 */}
      <View style={homeStyles.topRow}>
        <View style={homeStyles.spacer} />
        <PlayerCard
          player={players[1]}
          isCurrent={currentPlayer?.id === players[1].id}
          position="top"
        />
        <PlayerCard
          player={players[2]}
          isCurrent={currentPlayer?.id === players[2].id}
          position="top"
        />
        <View style={homeStyles.spacer} />
      </View>

      {/* 中间行：左玩家 + 牌桌 + 右玩家 */}
      <View style={homeStyles.middleRow}>
        <PlayerCard
          player={players[0]}
          isCurrent={currentPlayer?.id === players[0].id}
          position="left"
        />

        <View style={homeStyles.tableCenter}>
          <Text style={homeStyles.tableCenterTitle}>🎯 当前轮次</Text>
          <Text style={homeStyles.currentPlayerDisplay}>
            {currentPlayer?.name} {currentPlayer?.camp}阵营
          </Text>
          <Text style={homeStyles.currentPlayerHand}>
            手牌数: {currentPlayer?.hand.length}
          </Text>
        </View>

        <PlayerCard
          player={players[3]}
          isCurrent={currentPlayer?.id === players[3].id}
          position="right"
        />
      </View>

      {/* 底部座位 */}
      <View style={homeStyles.bottomRow}>
        <View style={homeStyles.spacer} />
        <PlayerCard
          player={players[4]}
          isCurrent={currentPlayer?.id === players[4].id}
          position="bottom"
        />
        <PlayerCard
          player={players[5]}
          isCurrent={currentPlayer?.id === players[5].id}
          position="bottom"
        />
        <View style={homeStyles.spacer} />
      </View>
    </View>
  );
}
