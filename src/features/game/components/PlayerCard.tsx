import { PlayerState } from "@/features/game/engine/gameEngineDemo";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface PlayerCardProps {
  player: PlayerState;
  isCurrent?: boolean;
  position?: "top" | "bottom" | "left" | "right";
}

/**
 * 玩家信息卡片组件
 * 显示玩家名字、阵营、手牌数、黑A状态等信息
 */
export function PlayerCard({
  player,
  isCurrent = false,
  position = "bottom",
}: PlayerCardProps) {
  const campColor = player.camp === "A" ? "#DBEAFE" : "#FEF3C7";
  const campBorderColor = player.camp === "A" ? "#0284C7" : "#D97706";

  const getFinishText = () => {
    if (player.finished) {
      return `🎉 已出完 (第${player.finishOrder}位)`;
    }
    return `⏳ 进行中 (${player.hand.length}张)`;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: campColor,
          borderColor: isCurrent ? "#FF6B00" : campBorderColor,
          borderWidth: isCurrent ? 3 : 2,
        },
        isCurrent && styles.currentHighlight,
      ]}
    >
      {/* 顶部：玩家名字和黑A指示 */}
      <View style={styles.header}>
        <Text style={styles.playerName} numberOfLines={1}>
          {player.name}
        </Text>
        {player.hasBlackA && <Text style={styles.blackABadge}>♠A</Text>}
      </View>

      {/* 中部：阵营和基本信息 */}
      <View style={styles.infoRow}>
        <View style={styles.infoPair}>
          <Text style={styles.infoLabel}>阵营</Text>
          <Text style={styles.infoValue}>{player.camp}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoPair}>
          <Text style={styles.infoLabel}>手牌</Text>
          <Text style={styles.infoValue}>{player.hand.length}</Text>
        </View>
      </View>

      {/* 手牌占位显示：显示手牌数量的卡背 */}
      <View style={styles.handContainer}>
        {player.hand.length === 0 ? (
          <Text style={styles.handEmptyText}>已出完</Text>
        ) : (
          <>
            {Array.from({ length: player.hand.length }).map((_, index) => (
              <View key={`card-${index}`} style={styles.cardBack}>
                <View style={styles.cardBackPattern} />
              </View>
            ))}
          </>
        )}
      </View>

      {/* 底部：状态 */}
      <View style={styles.footer}>
        <Text
          style={[styles.statusText, player.finished && styles.statusFinished]}
          numberOfLines={1}
        >
          {getFinishText()}
        </Text>
      </View>

      {/* 当前玩家指示器 */}
      {isCurrent && (
        <View style={styles.currentIndicator}>
          <Text style={styles.currentIndicatorText}>➤</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 10,
    minWidth: 100,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  currentHighlight: {
    shadowColor: "#FF6B00",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  playerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  blackABadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 6,
  },
  infoPair: {
    alignItems: "center",
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  handContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    gap: 3,
  },
  cardBack: {
    width: 16,
    height: 22,
    borderRadius: 2,
    backgroundColor: "#1F2937",
    borderWidth: 0.8,
    borderColor: "#4B5563",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  cardBackPattern: {
    width: 10,
    height: 14,
    borderRadius: 1,
    backgroundColor: "#374151",
  },
  handEmptyText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "#D1D5DB",
  },
  footer: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  statusFinished: {
    color: "#10B981",
    fontWeight: "700",
  },
  currentIndicator: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF6B00",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B00",
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  currentIndicatorText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
