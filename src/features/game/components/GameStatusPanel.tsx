import { GameState } from "@/features/game/engine/gameEngineDemo";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface GameStatusPanelProps {
  state: GameState;
}

/**
 * 游戏状态信息面板组件
 * 显示当前回合、出牌者、牌型等关键信息
 */
export function GameStatusPanel({ state }: GameStatusPanelProps) {
  const finishedCount = state.players.filter((p) => p.finished).length;
  const totalPlayers = state.players.length;
  const activeCount = totalPlayers - finishedCount;

  return (
    <View style={styles.container}>
      {/* 标题 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎮 游戏状态</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {state.gameOver ? "✅ 已结束" : "▶️ 进行中"}
          </Text>
        </View>
      </View>

      {/* 游戏进度 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>游戏进度</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressItem}>
            <Text style={styles.progressValue}>{finishedCount}</Text>
            <Text style={styles.progressLabel}>已出完</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressValue}>{activeCount}</Text>
            <Text style={styles.progressLabel}>还在打</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressValue}>{totalPlayers}</Text>
            <Text style={styles.progressLabel}>总玩家</Text>
          </View>
        </View>

        {/* 出完顺序 */}
        <View style={styles.finishOrderContainer}>
          <Text style={styles.finishOrderLabel}>出完顺序</Text>
          <View style={styles.finishOrderRow}>
            {state.players
              .filter((p) => p.finishOrder)
              .sort((a, b) => (a.finishOrder || 0) - (b.finishOrder || 0))
              .map((p) => (
                <View key={p.id} style={styles.finishOrderBadge}>
                  <Text style={styles.finishOrderNumber}>{p.finishOrder}</Text>
                  <Text style={styles.finishOrderName}>{p.name}</Text>
                </View>
              ))}
          </View>
        </View>
      </View>

      {/* 阵营统计 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>阵营统计</Text>
        <View style={styles.campRow}>
          {["A", "B"].map((camp) => {
            const campPlayers = state.players.filter((p) => p.camp === camp);
            const campFinished = campPlayers.filter((p) => p.finished).length;
            return (
              <View
                key={camp}
                style={[
                  styles.campBox,
                  camp === "A" ? styles.campBoxA : styles.campBoxB,
                ]}
              >
                <Text style={styles.campTitle}>
                  {camp} 阵营 ({campFinished}/{campPlayers.length})
                </Text>
                <View style={styles.campPlayers}>
                  {campPlayers.map((p) => (
                    <Text
                      key={p.id}
                      style={[
                        styles.campPlayerName,
                        p.finished && styles.campPlayerFinished,
                      ]}
                    >
                      {p.name} {p.finished ? "✅" : "⏳"}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  statusBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  progressValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  progressLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  finishOrderContainer: {
    marginTop: 8,
  },
  finishOrderLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  finishOrderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  finishOrderBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  finishOrderNumber: {
    fontSize: 12,
    fontWeight: "700",
    marginRight: 6,
  },
  finishOrderName: {
    fontSize: 12,
  },
  campRow: {
    flexDirection: "row",
    gap: 10,
  },
  handGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  handItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexBasis: "48%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
  },
  handItemFinished: {
    opacity: 0.7,
    borderColor: "#D1FAE5",
    backgroundColor: "#ECFDF5",
  },
  handName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  handCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  campBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  campBoxA: {
    backgroundColor: "#DBEAFE",
  },
  campBoxB: {
    backgroundColor: "#FEF3C7",
  },
  campTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  campPlayers: {
    gap: 4,
  },
  campPlayerName: {
    fontSize: 12,
    color: "#1F2937",
  },
  campPlayerFinished: {
    color: "#059669",
    fontWeight: "600",
  },
});
