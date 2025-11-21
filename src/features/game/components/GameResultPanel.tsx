import { PlayerState } from "@/features/game/engine/gameEngineDemo";
import { Result } from "@/features/game/engine/judgeResult";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface GameResultPanelProps {
  result: Result | null;
  players: PlayerState[];
}

export function GameResultPanel({ result, players }: GameResultPanelProps) {
  if (!result) {
    return null;
  }

  const campLabel: Record<Result["winner"], string> = {
    A: "A 阵营胜利 🎉",
    B: "B 阵营胜利 🎉",
    DRAW: "平局 🤝",
  };

  const caughtPlayers = result.caught
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is PlayerState => Boolean(p));

  const finishOrder = players
    .filter((p) => p.finishOrder)
    .sort((a, b) => (a.finishOrder ?? 0) - (b.finishOrder ?? 0));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏁 本局结算</Text>
      <Text style={styles.winner}>{campLabel[result.winner]}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>出完顺序</Text>
        <View style={styles.finishRow}>
          {finishOrder.length === 0 && (
            <Text style={styles.emptyText}>还没有人出完</Text>
          )}
          {finishOrder.map((player) => (
            <View key={player.id} style={styles.finishBadge}>
              <Text style={styles.finishOrder}>{player.finishOrder}</Text>
              <Text style={styles.finishName}>{player.name}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          ⚠️ 被抓玩家 {caughtPlayers.length > 0 && `(${caughtPlayers.length}人)`}
        </Text>
        {caughtPlayers.length === 0 ? (
          <View style={styles.noCaughtContainer}>
            <Text style={styles.noCaughtText}>✅ 无人被抓</Text>
            <Text style={styles.noCaughtSubtext}>本局无进贡</Text>
          </View>
        ) : (
          <>
            <View style={styles.caughtRow}>
              {caughtPlayers.map((player, index) => (
                <View key={player.id} style={styles.caughtBadge}>
                  <Text style={styles.caughtNumber}>{index + 1}</Text>
                  <View style={styles.caughtInfo}>
                    <Text style={styles.caughtName}>❌ {player.name}</Text>
                    <Text style={styles.caughtCamp}>{player.camp} 阵营</Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.caughtNote}>
              💡 下一局这些玩家需要向胜方进贡
            </Text>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>阵营详情</Text>
        <View style={styles.campRow}>
          {["A", "B"].map((camp) => {
            const campPlayers = players.filter((p) => p.camp === camp);
            const finished = campPlayers.filter((p) => p.finished).length;
            const caughtInCamp = campPlayers.filter((p) =>
              result.caught.includes(p.id)
            ).length;
            return (
              <View
                key={camp}
                style={[
                  styles.campBox,
                  camp === "A" ? styles.campA : styles.campB,
                ]}
              >
                <Text style={styles.campTitle}>
                  {camp} 阵营 {finished}/{campPlayers.length}
                </Text>
                {caughtInCamp > 0 && (
                  <Text style={styles.campCaughtInfo}>
                    ⚠️ {caughtInCamp}人被抓
                  </Text>
                )}
                {campPlayers.map((player) => {
                  const isCaught = result.caught.includes(player.id);
                  return (
                    <Text
                      key={player.id}
                      style={[
                        styles.campPlayer,
                        player.finished && styles.playerFinished,
                        isCaught && styles.playerCaught,
                      ]}
                    >
                      {player.name}{" "}
                      {isCaught ? "❌" : player.finished ? "✅" : "⏳"}
                    </Text>
                  );
                })}
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
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  title: {
    color: "#CBD5F5",
    fontSize: 14,
    letterSpacing: 1,
  },
  winner: {
    color: "#FCD34D",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  finishRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  finishBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  finishOrder: {
    color: "#F472B6",
    fontWeight: "700",
    marginRight: 6,
  },
  finishName: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  emptyText: {
    color: "#94A3B8",
  },
  noCaughtContainer: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "#10B981",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  noCaughtText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  noCaughtSubtext: {
    color: "#6EE7B7",
    fontSize: 12,
  },
  caughtRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  caughtBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "#EF4444",
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 120,
  },
  caughtNumber: {
    color: "#EF4444",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 10,
  },
  caughtInfo: {
    flex: 1,
  },
  caughtName: {
    color: "#FEE2E2",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 2,
  },
  caughtCamp: {
    color: "#FCA5A5",
    fontSize: 11,
  },
  caughtNote: {
    color: "#FCD34D",
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  campRow: {
    flexDirection: "row",
    gap: 10,
  },
  campBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  campA: {
    backgroundColor: "rgba(59, 130, 246, 0.25)",
  },
  campB: {
    backgroundColor: "rgba(251, 191, 36, 0.25)",
  },
  campTitle: {
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 4,
    fontSize: 14,
  },
  campCaughtInfo: {
    color: "#FCA5A5",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  campPlayer: {
    color: "#E2E8F0",
    fontSize: 12,
    marginBottom: 2,
  },
  playerFinished: {
    color: "#86EFAC",
  },
  playerCaught: {
    color: "#FCA5A5",
    fontWeight: "700",
  },
});
