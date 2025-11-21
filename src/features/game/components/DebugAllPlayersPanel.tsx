import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export function DebugAllPlayersPanel({
  state,
  manualPlayerIndex,
  manualRequest,
}: any) {
  if (!state) return null;

  const { players, currentPlayerIndex, lastPlay } = state;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🟦 全员调试面板（Debug View）</Text>

      {/* 当前游戏信息 */}
      <View style={styles.block}>
        <Text style={styles.label}>🎯 当前出牌玩家：</Text>
        <Text style={styles.value}>
          P{currentPlayerIndex}（{players[currentPlayerIndex]?.name}）
        </Text>

        <Text style={styles.label}>🤖 本机控制玩家：</Text>
        <Text style={styles.value}>
          P{manualPlayerIndex}
          {manualPlayerIndex != null
            ? `（${players[manualPlayerIndex]?.name}）`
            : ""}
        </Text>

        <Text style={styles.label}>📝 当前手动请求：</Text>
        {manualRequest?.request ? (
          <Text style={styles.value}>
            → 需要 P{manualRequest.request.playerIndex}（
            {manualRequest.request.playerName}）操作
          </Text>
        ) : (
          <Text style={styles.value}>无</Text>
        )}
      </View>

      {/* 桌面牌 */}
      <View style={styles.block}>
        <Text style={styles.label}>🃏 桌面牌：</Text>
        {lastPlay ? (
          <Text style={styles.value}>
            {lastPlay.cards.map((c: any) => c.rank + c.suit).join(" ")}（
            {lastPlay.type}）
          </Text>
        ) : (
          <Text style={styles.value}>空</Text>
        )}
      </View>

      {/* 所有玩家 */}
      <ScrollView style={styles.playersList}>
        {players.map((p: any, i: any) => (
          <View key={i} style={styles.playerBlock}>
            <Text style={styles.playerTitle}>
              👤 玩家 P{i}：{p.name}
            </Text>

            <Text style={styles.info}>阵营：{p.camp}</Text>
            <Text style={styles.info}>
              手牌数：{p.hand.length} {p.finished ? "(已出完)" : ""}
            </Text>

            <Text style={styles.info}>
              手牌：{p.hand.map((c: any) => c.rank + c.suit).join(" ")}
            </Text>

            {currentPlayerIndex === i && (
              <Text style={styles.highlight}>👉 当前出牌</Text>
            )}

            {manualRequest?.request?.playerIndex === i && (
              <Text style={[styles.highlight, { color: "orange" }]}>
                🎮 需要操作（手动请求）
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111",
    padding: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: "#333",
  },
  title: {
    color: "#4af",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  block: {
    marginBottom: 12,
  },
  label: {
    color: "#bbb",
    fontSize: 14,
  },
  value: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 4,
  },

  playersList: {
    maxHeight: 350,
  },

  playerBlock: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  playerTitle: {
    color: "#6cf",
    fontWeight: "bold",
  },
  info: {
    color: "#ccc",
    fontSize: 12,
  },
  highlight: {
    marginTop: 4,
    color: "#0f0",
    fontWeight: "bold",
  },
});
