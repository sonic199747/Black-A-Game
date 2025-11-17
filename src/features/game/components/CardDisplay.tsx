import React from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
} from "react-native";

import { Card } from "@/features/game/engine/cards";

import { getCardImageSource } from "./cardImageMap";

type CardSize = "small" | "medium" | "large";

const sizeMap: Record<CardSize, { width: number; height: number }> = {
  small: { width: 44, height: 64 },
  medium: { width: 58, height: 86 },
  large: { width: 72, height: 110 },
};

interface CardDisplayProps {
  card: Card;
  size?: CardSize;
  style?: StyleProp<ImageStyle>;
}

export function CardDisplay({
  card,
  size = "medium",
  style,
}: CardDisplayProps) {
  const sizeStyle = sizeMap[size];
  const source = getCardImageSource(card);

  return (
    <Image
      source={source}
      resizeMode="contain"
      style={[styles.cardImage, sizeStyle, style]}
    />
  );
}

const styles = StyleSheet.create({
  cardImage: {
    borderRadius: 8,
  },
});
