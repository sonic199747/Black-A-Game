import { Card, compareCard } from "@/features/game/engine/cards";
import { PlayerState } from "@/features/game/engine/gameEngineDemo";
import { ManualDecisionRequest } from "@/features/game/engine/manualController";
import { Play, canBeat, classifyPlay } from "@/features/game/engine/plays";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { HandCards } from "./HandCards";

const PLAYFUL_FONT_FAMILY = "KeinannMaruPOP";

export interface ManualPlayerPanelProps {
  player: PlayerState | null;
  request: ManualDecisionRequest | null;
  lastPlay: Play | null;
  mustBeatCurrent: boolean;
  triggerPlayerName?: string;
  onSubmit: (cards: Card[]) => void;
  onPass: () => void;
  onHintRequest?: () => Card[] | null;
  variant?: "standalone" | "embedded";
}

export function ManualPlayerPanel({
  player,
  request,
  lastPlay,
  mustBeatCurrent,
  onSubmit,
  onPass,
  onHintRequest,
  variant = "standalone",
}: ManualPlayerPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const actionable = Boolean(request && player);

  const sortedHand = useMemo(() => {
    if (!player) return [];
    return [...player.hand].sort(compareCard);
  }, [player]);

  const selectedCards = useMemo(() => {
    if (!player) return [];
    return player.hand.filter((card) => selectedIds.includes(card.id));
  }, [player, selectedIds]);

  const selectionPlay = useMemo(() => {
    if (selectedCards.length === 0) return null;
    return classifyPlay(selectedCards);
  }, [selectedCards]);

  const meetsTableRequirement =
    !mustBeatCurrent ||
    !lastPlay ||
    (selectionPlay ? canBeat(lastPlay, selectionPlay) : false);

  const canSubmit =
    actionable &&
    selectedCards.length > 0 &&
    Boolean(selectionPlay) &&
    meetsTableRequirement;

  useEffect(() => {
    if (!player) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((prev) =>
      prev.filter((id) => player.hand.some((card) => card.id === id))
    );
  }, [player]);

  const toggleCard = (cardId: string) => {
    if (!actionable) return;
    setSelectedIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handleSubmit = () => {
    if (!player || !request || !canSubmit || selectedCards.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedIds([]);
    onSubmit(selectedCards);
  };

  const handlePass = () => {
    if (!request) return;
    Haptics.selectionAsync().catch(() => {});
    setSelectedIds([]);
    onPass();
  };

  const handleHint = () => {
    if (!actionable || !onHintRequest) return;
    const recommendation = onHintRequest();
    if (recommendation && recommendation.length > 0) {
      const ids = recommendation.map((card) => card.id);
      setSelectedIds(ids);
    } else {
      setSelectedIds([]);
    }
  };

  const handSection =
    variant === "embedded" ? (
      <View style={styles.embeddedHandSection}>
        <View style={styles.compactActionRow}>
          <TouchableOpacity
            style={[
              styles.compactActionButton,
              styles.compactPassButton,
              !actionable && styles.buttonDisabled,
            ]}
            onPress={handlePass}
            disabled={!actionable}
          >
            <Text style={styles.compactActionText}>不出</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.compactActionButton,
              styles.compactHintButton,
              (!actionable || !onHintRequest) && styles.buttonDisabled,
            ]}
            onPress={handleHint}
            disabled={!actionable || !onHintRequest}
          >
            <Text
              style={[styles.compactActionText, styles.compactHintButtonText]}
            >
              提示
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.compactActionButton,
              styles.compactPlayButton,
              (!canSubmit || selectedCards.length === 0) &&
                styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.compactActionText}>出牌</Text>
          </TouchableOpacity>
        </View>
        <HandCards
          cards={sortedHand}
          selectedIds={selectedIds}
          onToggleSelect={toggleCard}
          actionable={actionable}
        />
      </View>
    ) : (
      <>
        <View style={styles.tableActionRow}>
          <TouchableOpacity
            style={[
              styles.tableActionButton,
              styles.tablePassButton,
              !actionable && styles.buttonDisabled,
            ]}
            onPress={handlePass}
            disabled={!actionable}
          >
            <Text style={styles.tableActionText}>不出</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tableActionButton,
              styles.tableHintButton,
              (!actionable || !onHintRequest) && styles.buttonDisabled,
            ]}
            onPress={handleHint}
            disabled={!actionable || !onHintRequest}
          >
            <Text style={styles.tableHintActionText}>提示</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tableActionButton,
              styles.tablePlayButton,
              (!canSubmit || selectedCards.length === 0) &&
                styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.tableActionText}>出牌</Text>
          </TouchableOpacity>
        </View>
        <HandCards
          cards={sortedHand}
          selectedIds={selectedIds}
          onToggleSelect={toggleCard}
          actionable={actionable}
        />
      </>
    );

  const panelContent = handSection;

  if (variant === "embedded") {
    return <View style={styles.embeddedContainer}>{panelContent}</View>;
  }

  return <>{panelContent}</>;
}

const styles = StyleSheet.create({
  embeddedContainer: {
    marginVertical: 0,
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(7, 16, 37, 0.85)",
    width: "100%",
    flex: 1,
    flexDirection: "column",
  },
  embeddedHandSection: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  tableActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableActionButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(15,23,42,0.75)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    minHeight: 58,
    minWidth: 110,
  },
  tablePassButton: {
    backgroundColor: "rgba(71,85,105,0.9)",
  },
  tableHintButton: {
    backgroundColor: "#FACC15",
    borderColor: "#FACC15",
  },
  tablePlayButton: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  tableActionText: {
    color: "#F8FAFC",
    fontWeight: "700",
    fontSize: 20,
    fontFamily: PLAYFUL_FONT_FAMILY,
  },
  tableHintActionText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 20,
    fontFamily: PLAYFUL_FONT_FAMILY,
  },
  // 紧凑按钮样式（嵌入式布局）
  compactActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  compactActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 70,
  },
  compactPassButton: {
    backgroundColor: "#64748B",
  },
  compactHintButton: {
    backgroundColor: "#FBBF24",
  },
  compactPlayButton: {
    backgroundColor: "#22C55E",
  },
  compactActionText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: PLAYFUL_FONT_FAMILY,
  },
  compactHintButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontFamily: PLAYFUL_FONT_FAMILY,
  },
});
