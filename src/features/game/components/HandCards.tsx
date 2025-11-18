import React, { useMemo } from "react";
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
  const cardSpacing = useMemo(() => {
    if (cards.length <= 5) return 12;
    if (cards.length <= 8) return 6;
    if (cards.length <= 12) return -4;
    if (cards.length <= 16) return -10;
    return -14;
  }, [cards.length]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {cards.map((card, index) => {
          const selected = selectedIds.includes(card.id);
          const baseLift = selected ? -26 : 0;

          return (
            <Pressable
              key={card.id}
              onPress={() => actionable && onToggleSelect(card.id)}
              style={({ pressed }) => {
                const pressLift = pressed ? -4 : 0;
                return [
                  styles.cardWrapper,
                  {
                    marginLeft: index === 0 ? 0 : cardSpacing,
                    transform: [{ translateY: baseLift + pressLift }],
                    zIndex: selected ? 100 + index : index,
                  },
                ];
              }}
            >
              <CardDisplay card={card} size="large" />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 170,
    justifyContent: "flex-end",
    paddingTop: 12,
    paddingBottom: 2,
    overflow: "visible",
  },
  scrollView: {
    overflow: "visible",
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  cardWrapper: {
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
});
