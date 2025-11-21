import { Card } from "@/features/game/engine/cards";
import type { GameState } from "@/features/game/engine/gameEngine";
import type {
  TributeExchange,
  TributeSummary,
} from "@/shared/gameEngine/gameEngineDemo"; // 或者你实际的路径
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

type ExtendedGameState = GameState & {
  tributeSummary?: TributeSummary | null;
};

interface GameStatusPanelProps {
  state: ExtendedGameState;
}

/**
 * 游戏状态信息面板组件
 * 显示当前回合、出牌者、牌型等关键信息
 */
export function GameStatusPanel({ state }: GameStatusPanelProps) {
  const finishedCount = state.players.filter((p) => p.finished).length;
  const totalPlayers = state.players.length;
  const activeCount = totalPlayers - finishedCount;
  const tributeSummary = state.tributeSummary ?? null;
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    state.players.forEach((player) => {
      map.set(player.id, player.name);
    });
    return map;
  }, [state.players]);

  const formatCardLabel = (card: Card) => {
    const suitSymbol: Record<Card["suit"], string> = {
      spade: "♠",
      heart: "♥",
      club: "♣",
      diamond: "♦",
      joker: "",
    };

    if (card.rank === "SJ") return "🃏小王";
    if (card.rank === "BJ") return "🃏大王";
    return `${suitSymbol[card.suit]}${card.rank}`;
  };

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

      {/* 进贡提示 */}
      {tributeSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>进贡阶段</Text>
          <Text style={styles.tributeSummaryText}>
            上局 {tributeSummary.winnerCamp} 阵营胜利，
            {tributeSummary.caughtIds.length} 名玩家需要进贡
          </Text>
          <View style={styles.tributeList}>
            {tributeSummary.exchanges.map((exchange: TributeExchange) => (
              <View key={exchange.giverId} style={styles.tributeCard}>
                <Text style={styles.tributeGiver}>
                  {exchange.giverName} 进贡
                </Text>
                <Text style={styles.tributeLine}>
                  <Text style={styles.tributeLabel}>送出：</Text>
                  {exchange.tributeCards
                    .map((t) => {
                      const receiverName = nameById.get(t.toId) ?? `${t.toId}`;
                      return `${formatCardLabel(t.card)}→${receiverName}`;
                    })
                    .join("，")}
                </Text>
                <Text style={styles.tributeLine}>
                  <Text style={styles.tributeLabel}>回赠：</Text>
                  {exchange.returnCards.length > 0
                    ? exchange.returnCards
                        .map((t) => {
                          const giverName =
                            nameById.get(t.fromId) ?? `${t.fromId}`;
                          return `${giverName}→${formatCardLabel(t.card)}`;
                        })
                        .join("，")
                    : "胜利方暂未返还（无≤10的牌）"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

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
  tributeSummaryText: {
    color: "#1F2937",
    fontSize: 13,
    marginBottom: 8,
  },
  tributeList: {
    gap: 8,
  },
  tributeCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    padding: 10,
  },
  tributeGiver: {
    fontWeight: "700",
    color: "#1D4ED8",
    marginBottom: 4,
  },
  tributeLine: {
    color: "#1F2937",
    fontSize: 12,
    marginBottom: 2,
  },
  tributeLabel: {
    fontWeight: "600",
    color: "#4C1D95",
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
