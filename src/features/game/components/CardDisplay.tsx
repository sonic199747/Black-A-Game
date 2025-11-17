import { Card } from "@/features/game/engine/cards";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

type CardSize = "small" | "medium" | "large";

const sizeMap: Record<CardSize, { width: number; height: number; font: number }> =
  {
    small: { width: 42, height: 60, font: 16 },
    medium: { width: 54, height: 76, font: 18 },
    large: { width: 64, height: 94, font: 24 },
  };

interface CardDisplayProps {
  card: Card;
  size?: CardSize;
  style?: StyleProp<ViewStyle>;
}

const suitMeta: Record<Card["suit"], { icon: string; color: string }> = {
  spade: { icon: "♠", color: "#111827" },
  heart: { icon: "♥", color: "#DC2626" },
  club: { icon: "♣", color: "#065F46" },
  diamond: { icon: "♦", color: "#DC2626" },
  joker: { icon: "★", color: "#7C3AED" },
};

export function CardDisplay({
  card,
  size = "medium",
  style,
}: CardDisplayProps) {
  const sizeStyle = sizeMap[size];
  const meta = suitMeta[card.suit];

  return (
    <View
      style={[
        styles.base,
        {
          width: sizeStyle.width,
          height: sizeStyle.height,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <Text
          style={[
            styles.rank,
            { fontSize: sizeStyle.font, color: meta.color },
          ]}
        >
          {card.rank}
        </Text>
        <Text style={[styles.suit, { color: meta.color }]}>{meta.icon}</Text>
      </View>
      <Text style={[styles.corner, { color: meta.color }]}>{meta.icon}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    marginRight: 6,
    padding: 6,
    justifyContent: "space-between",
    shadowColor: "#111827",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  rank: {
    fontWeight: "700",
  },
  suit: {
    fontSize: 16,
    fontWeight: "600",
  },
  corner: {
    fontSize: 10,
    alignSelf: "flex-end",
    opacity: 0.6,
  },
});
