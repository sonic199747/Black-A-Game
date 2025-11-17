import React from "react";
import { Text, View } from "react-native";
import { homeStyles } from "../styles/homeStyles";

/**
 * 顶部信息栏组件
 * 仅保留游戏标题和副标题
 */
export function TopInfoBar() {
  return (
    <View style={homeStyles.titleSection}>
      <Text style={homeStyles.title}>🎮 抓黑A</Text>
      <Text style={homeStyles.subtitle}>团队对战 · 6人桌面</Text>
    </View>
  );
}
