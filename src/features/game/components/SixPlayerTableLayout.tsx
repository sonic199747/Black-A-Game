// src/features/game/components/SixPlayerTableLayout.tsx
import { PlayerState } from "@/features/game/engine/gameEngineDemo";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PlayerCard } from "./PlayerCard";

type SeatPosition =
  | "bottom"
  | "bottomRight"
  | "topRight"
  | "top"
  | "topLeft"
  | "bottomLeft";

interface SixPlayerTableLayoutProps {
  players: PlayerState[]; // 按 game state 顺序排的 6 个玩家
  currentPlayerIndex: number; // 当前出牌玩家的索引
  selfIndex: number; // “我”在 players 数组里的索引
}

/**
 * 6 人牌桌布局（纯 UI）
 * - 自己永远在底部
 * - 其他玩家按顺时针 / 逆时针环绕
 */
export function SixPlayerTableLayout({
  players,
  currentPlayerIndex,
  selfIndex,
}: SixPlayerTableLayoutProps) {
  if (players.length !== 6) {
    return (
      <View style={styles.fallback}>
        <Text>目前只支持 6 人牌桌</Text>
      </View>
    );
  }

  const seatAssignments = players.map((player, index) => {
    const relative = (index - selfIndex + players.length) % players.length;
    const seat = mapRelativeIndexToSeat(relative);
    const isCurrent = index === currentPlayerIndex;

    return { player, seat, isCurrent };
  });

  return (
    <View style={styles.container}>
      <View style={styles.centerTable}>
        <Text>底牌区域</Text>
      </View>

      {seatAssignments.map(({ player, seat, isCurrent }, index) => (
        <View key={index} style={[styles.seatBase, seatPositionStyle[seat]]}>
          <PlayerCard player={player} isCurrent={isCurrent} />
        </View>
      ))}
    </View>
  );
}

function mapRelativeIndexToSeat(relativeIndex: number): SeatPosition {
  switch (relativeIndex) {
    case 0:
      return "bottom";
    case 1:
      return "bottomRight";
    case 2:
      return "topRight";
    case 3:
      return "top";
    case 4:
      return "topLeft";
    case 5:
      return "bottomLeft";
    default:
      return "bottom";
  }
}

const seatPositionStyle: Record<SeatPosition, any> = {
  // 自己：底部中间，抬高一点给手牌留空间
  bottom: {
    bottom: 140, // 如果以后你手牌更高，可以再调大一点
    left: "50%",
    marginLeft: -70, // 让卡片居中
  },
  // 右下
  bottomRight: {
    bottom: 180,
    right: 20,
  },
  // 右上
  topRight: {
    top: 80,
    right: 20,
  },
  // 正上
  top: {
    top: 30,
    left: "50%",
    marginLeft: -70,
  },
  // 左上
  topLeft: {
    top: 80,
    left: 20,
  },
  // 左下
  bottomLeft: {
    bottom: 180,
    left: 20,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerTable: {
    position: "absolute",
    top: "40%",
    left: "30%",
    right: "30%",
    height: "20%",
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
  },
  seatBase: {
    position: "absolute",
  },
});
