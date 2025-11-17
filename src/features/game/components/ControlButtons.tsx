import React from "react";
import { Button, Text, View } from "react-native";
import { homeStyles } from "../styles/homeStyles";

interface ControlButtonsProps {
  gameOver: boolean;
  onRestart: () => void;
  onNextTurn: () => void;
  isManualMode?: boolean;
  waitingForManual?: boolean;
}

/**
 * 控制按钮组件
 * 包含重新开局和下一回合的控制按钮
 */
export function ControlButtons({
  gameOver,
  onRestart,
  onNextTurn,
  isManualMode = false,
  waitingForManual = false,
}: ControlButtonsProps) {
  const nextLabel = isManualMode ? "▶ 推进到我的操作" : "▶ 下一回合 (AI 自动)";

  return (
    <View style={homeStyles.buttonSection}>
      <Button title="🔁 重新开局" onPress={onRestart} color="#3B82F6" />
      {!gameOver && <View style={homeStyles.buttonSpace} />}
      {!gameOver && (
        <Button
          title={nextLabel}
          onPress={onNextTurn}
          color={isManualMode ? "#A855F7" : "#10B981"}
          disabled={waitingForManual}
        />
      )}

      {isManualMode && waitingForManual && (
        <Text style={homeStyles.manualHintText}>
          🎯 当前轮到你出牌，请在下方操作区完成动作
        </Text>
      )}
    </View>
  );
}
