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
        <Text style={styles.sectionTitle}>被抓玩家</Text>
        {caughtPlayers.length === 0 ? (
          <Text style={styles.emptyText}>无人被抓 👏</Text>
        ) : (
          <View style={styles.caughtRow}>
            {caughtPlayers.map((player) => (
              <View key={player.id} style={styles.caughtBadge}>
                <Text style={styles.caughtName}>{player.name}</Text>
                <Text style={styles.caughtCamp}>{player.camp} 阵营</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>阵营存活</Text>
        <View style={styles.campRow}>
          {["A", "B"].map((camp) => {
            const campPlayers = players.filter((p) => p.camp === camp);
            const finished = campPlayers.filter((p) => p.finished).length;
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
                {campPlayers.map((player) => (
                  <Text
                    key={player.id}
                    style={[
                      styles.campPlayer,
                      player.finished && styles.playerFinished,
                    ]}
                  >
                    {player.name} {player.finished ? "✅" : "⏳"}
                  </Text>
                ))}
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
  caughtRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  caughtBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "#F87171",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  caughtName: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  caughtCamp: {
    color: "#FECACA",
    fontSize: 12,
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
});
