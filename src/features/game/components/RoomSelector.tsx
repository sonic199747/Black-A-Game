// src/features/game/components/RoomSelector.tsx
import React, { useState } from "react";
import { Button, Text, TextInput, View, StyleSheet } from "react-native";

export interface RoomSelectorProps {
  onJoinRoom: (roomId: string, displayName: string) => void;
  defaultDisplayName?: string;
}

export function RoomSelector({
  onJoinRoom,
  defaultDisplayName = "玩家",
}: RoomSelectorProps) {
  const [roomId, setRoomId] = useState("");
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const handleQuickJoin = (quickRoomId: string) => {
    if (!displayName.trim()) {
      alert("请输入昵称");
      return;
    }
    onJoinRoom(quickRoomId, displayName.trim());
  };

  const handleCustomJoin = () => {
    if (!displayName.trim()) {
      alert("请输入昵称");
      return;
    }
    if (!roomId.trim()) {
      alert("请输入房间号");
      return;
    }
    onJoinRoom(roomId.trim(), displayName.trim());
  };

  const handleCreateNew = () => {
    if (!displayName.trim()) {
      alert("请输入昵称");
      return;
    }
    // 生成随机房间 ID
    const newRoomId = `room-${Date.now()}`;
    onJoinRoom(newRoomId, displayName.trim());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎮 加入联机房间</Text>

      {/* 昵称输入 */}
      <View style={styles.section}>
        <Text style={styles.label}>你的昵称：</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="请输入昵称"
          placeholderTextColor="#666"
          maxLength={20}
        />
      </View>

      {/* 快速加入 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>快速加入</Text>
        <View style={styles.quickButtons}>
          <Button
            title="房间 1"
            onPress={() => handleQuickJoin("room-1")}
            color="#3B82F6"
          />
          <Button
            title="房间 2"
            onPress={() => handleQuickJoin("room-2")}
            color="#3B82F6"
          />
          <Button
            title="房间 3"
            onPress={() => handleQuickJoin("room-3")}
            color="#3B82F6"
          />
        </View>
      </View>

      {/* 创建新房间 */}
      <View style={styles.section}>
        <Button
          title="🆕 创建新房间"
          onPress={handleCreateNew}
          color="#10B981"
        />
      </View>

      {/* 自定义房间号 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>或输入房间号</Text>
        <TextInput
          style={styles.input}
          value={roomId}
          onChangeText={setRoomId}
          placeholder="输入房间号（例如：my-room）"
          placeholderTextColor="#666"
        />
        <View style={styles.joinButton}>
          <Button
            title="加入房间"
            onPress={handleCustomJoin}
            disabled={!roomId.trim()}
            color="#8B5CF6"
          />
        </View>
      </View>

      <Text style={styles.hint}>
        💡 提示：多个玩家输入相同房间号即可一起游戏
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    borderRadius: 16,
    marginVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#D1D5DB",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(55, 65, 81, 0.8)",
    borderRadius: 8,
    padding: 12,
    color: "#FFFFFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.5)",
  },
  quickButtons: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  joinButton: {
    marginTop: 10,
  },
  hint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 10,
  },
});

