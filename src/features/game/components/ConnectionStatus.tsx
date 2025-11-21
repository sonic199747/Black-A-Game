// src/features/game/components/ConnectionStatus.tsx
import React from "react";
import { Text, View, StyleSheet, Button } from "react-native";

// 支持的连接状态类型（兼容 RoomGatewayConnectionState）
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface ConnectionStatusProps {
  state: ConnectionState;
  onReconnect?: () => void;
}

export function ConnectionStatus({
  state,
  onReconnect,
}: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (state) {
      case "connected":
        return {
          emoji: "🟢",
          text: "已连接",
          color: "#10B981",
          showReconnect: false,
        };
      case "connecting":
        return {
          emoji: "🟡",
          text: "连接中...",
          color: "#F59E0B",
          showReconnect: false,
        };
      case "disconnected":
        return {
          emoji: "⚪",
          text: "未连接",
          color: "#6B7280",
          showReconnect: true,
        };
      case "error":
        return {
          emoji: "🔴",
          text: "连接失败",
          color: "#EF4444",
          showReconnect: true,
        };
      default:
        // 默认显示未连接状态
        return {
          emoji: "⚪",
          text: "未连接",
          color: "#6B7280",
          showReconnect: true,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.container,
        { borderColor: config.color + "40", backgroundColor: config.color + "20" },
      ]}
    >
      <View style={styles.statusRow}>
        <Text style={styles.emoji}>{config.emoji}</Text>
        <Text style={[styles.text, { color: config.color }]}>
          {config.text}
        </Text>
        {config.showReconnect && onReconnect && (
          <Button
            title="重连"
            onPress={onReconnect}
            color={config.color}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emoji: {
    fontSize: 16,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});

