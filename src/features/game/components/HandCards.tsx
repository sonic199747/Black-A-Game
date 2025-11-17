import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { Card } from "../engine/cards";
import { CardDisplay } from "./CardDisplay";

interface HandCardsProps {
  cards: Card[]; // 排序好的手牌
  selectedIds: string[]; // 哪些牌被选中了
  onToggleSelect: (id: string) => void;
  actionable?: boolean; // 当前是否能操作牌（不是自己回合时禁用）
}

export function HandCards({
  cards,
  selectedIds,
  onToggleSelect,
  actionable = true,
}: HandCardsProps) {
  const cardWidth = 48;
  const overlap = 20;

  const totalWidth =
    cards.length > 0 ? cardWidth + (cards.length - 1) * overlap : 0;

  // 用于弧形 & 扇形的参数
  const count = cards.length;
  const centerIndex = (count - 1) / 2; // 中心索引（可以是小数）
  const maxFanAngle = 22; // 整个扇形的总角度（左右各一半）
  const arcHeight = 14; // 弧形中间抬起的高度（像扇形边缘低，中间高）

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { width: Math.max(totalWidth, 0) },
        ]}
      >
        {cards.map((card, index) => {
          const selected = selectedIds.includes(card.id);

          // 扇形角度：左负右正，中间接近 0°
          const angleStep = count > 1 ? maxFanAngle / (count - 1) : 0;
          const angle = (index - centerIndex) * angleStep; // 例如 -11°, -5.5°, 0, 5.5°, 11°

          // 弧形高度：中间最高，两边逐渐变低
          // t 在 [-1, 1] 之间，中间 0，两边 ±1
          const t = count <= 1 ? 0 : (index - centerIndex) / centerIndex;
          const baseYOffset = -arcHeight * (1 - t * t); // 抛物线，中间 -arcHeight，两边 0

          // 选中 / 按下时的额外位移
          let translateY = baseYOffset;
          if (selected) {
            translateY -= 10; // 再往上抬一点
          }

          // Pressable 的 pressed 态里再加一点细节
          return (
            <Pressable
              key={card.id}
              onPress={() => actionable && onToggleSelect(card.id)}
              style={({ pressed }) => {
                const extraPressOffset = pressed ? -4 : 0;

                return [
                  styles.cardWrapper,
                  // 重叠
                  { marginLeft: index === 0 ? 0 : -overlap },
                  {
                    transform: [
                      { translateY: translateY + extraPressOffset },
                      { rotate: `${angle}deg` },
                    ],
                  },
                ];
              }}
            >
              <CardDisplay card={card} size="medium" />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 130, // 稍微高一点，给弧形留空间
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "flex-end", // 以底部为基准往上弯
    paddingVertical: 4,
  },
  cardWrapper: {
    // transform 在上面动态计算
  },
});
