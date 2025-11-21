import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Card, compareCard } from "@/features/game/engine/cards";
import { PlayerState } from "@/features/game/engine/gameEngineDemo";
import { ManualDecisionNeeded } from "@/features/game/hooks/useGameState";
import { Play, canBeat, classifyPlay } from "@/features/game/engine/plays";

import { HandCards } from "./HandCards";

const PLAYFUL_FONT_FAMILY = "KeinannMaruPOP";
export interface ManualPlayerPanelProps {
  player: PlayerState | null;
  request: ManualDecisionNeeded | null; // ✅ 和引擎里的类型对上
  lastPlay: Play | null;
  mustBeatCurrent: boolean;
  hasBeatablePlay?: boolean;
  triggerPlayerName?: string;
  onSubmit: (cards: Card[]) => void;
  onPass: () => void;
  onHintRequest?: () => Promise<Card[] | null>;
  variant?: "standalone" | "embedded";
}
export function ManualPlayerPanel({
  player,
  request,
  lastPlay,
  mustBeatCurrent,
  hasBeatablePlay = true,
  onSubmit,
  onPass,
  onHintRequest,
  variant = "standalone",
}: ManualPlayerPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 只要有玩家数据，就可以整理和查看手牌
  const canInteractWithCards = Boolean(player);
  // 只有轮到该玩家出牌时（request 存在），才能操作按钮
  const canOperateButtons = Boolean(request && player);
  // 只有 REACT 阶段（跟牌阶段）才能 PASS
  const canPass = !!request && request.type === "REACT";

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
    canOperateButtons &&
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
    // 允许所有玩家都能整理和查看手牌，即使不是自己的回合
    if (!canInteractWithCards) return;
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
    // 如果根本轮不到这个玩家（按钮其实也会是 disabled），就直接返回
    // TURN 阶段禁止 PASS：再加一层保护
    if (!request || !canOperateButtons || !canPass) return;
    Haptics.selectionAsync().catch(() => {});
    setSelectedIds([]);
    onPass();
  };

  const handleHint = () => {
    if (!canOperateButtons || !onHintRequest) return;
    onHintRequest()
      .then((recommendation) => {
        if (recommendation && recommendation.length > 0) {
          const ids = recommendation.map((card) => card.id);
          setSelectedIds(ids);
        } else {
          setSelectedIds([]);
        }
      })
      .catch((error) => {
        console.warn("Hint request failed", error);
      });
  };

  const handleClear = () => {
    if (selectedIds.length === 0) return;
    Haptics.selectionAsync().catch(() => {});
    setSelectedIds([]);
  };

  // 跳过按钮的显示逻辑：
  // 1. 必须轮到该玩家出牌（canOperateButtons 为 true）
  // 2. 必须是在"跟牌"的场景（mustBeatCurrent 为 true，即桌面上已有上一手牌）
  // 3. 如果是主动出牌（mustBeatCurrent 为 false），则不显示跳过按钮
  // 注意：当轮到玩家管牌时，无论是否有可以管的牌，都应该显示跳过按钮
  const shouldShowPassButton = canOperateButtons && canPass;

  useEffect(() => {
    if (canOperateButtons) {
      console.log("🔍 跳过按钮调试信息:", {
        canOperateButtons,
        mustBeatCurrent,
        shouldShowPassButton,
        hasLastPlay: !!lastPlay,
        request, // 直接把整个 request 打出来
      });
    }
  }, [
    canOperateButtons,
    mustBeatCurrent,
    shouldShowPassButton,
    request,
    lastPlay,
  ]);

  // 调试信息：专门看这个面板当前拿到的 request 是不是给自己的
  useEffect(() => {
    console.log("🧪 ManualPanel debug:", {
      playerName: player?.name,
      playerFinished: player?.finished,
      hasRequest: !!request,
      requestPlayerIndex: request?.playerIndex,
      mustBeatCurrent,
    });
  }, [player, request, mustBeatCurrent]);

  // 当轮到玩家管牌时，如果没有可以管的牌，显示提示语
  const shouldShowNoBeatablePlayHint =
    canOperateButtons && mustBeatCurrent && !hasBeatablePlay;

  const handSection =
    variant === "embedded" ? (
      <View style={styles.embeddedHandSection}>
        {shouldShowNoBeatablePlayHint && (
          <Text style={styles.hintText}>没有可以大过上家的牌</Text>
        )}
        <View style={styles.compactActionRow}>
          {shouldShowPassButton && (
            <TouchableOpacity
              style={[
                styles.compactActionButton,
                styles.compactPassButton,
                (!canOperateButtons || !canPass) && styles.buttonDisabled,
              ]}
              onPress={handlePass}
              disabled={!canOperateButtons || !canPass}
            >
              <Text style={styles.compactActionText}>不出</Text>
            </TouchableOpacity>
          )}
          {canOperateButtons && (
            <TouchableOpacity
              style={[
                styles.compactActionButton,
                styles.compactHintButton,
                !onHintRequest && styles.buttonDisabled,
              ]}
              onPress={handleHint}
              disabled={!onHintRequest}
            >
              <Text
                style={[styles.compactActionText, styles.compactHintButtonText]}
              >
                提示
              </Text>
            </TouchableOpacity>
          )}
          {canOperateButtons && (
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
          )}
          {selectedIds.length > 0 && (
            <TouchableOpacity
              style={[styles.compactActionButton, styles.compactClearButton]}
              onPress={handleClear}
            >
              <Text style={styles.compactActionText}>清除</Text>
            </TouchableOpacity>
          )}
        </View>
        <HandCards
          cards={sortedHand}
          selectedIds={selectedIds}
          onToggleSelect={toggleCard}
          actionable={canInteractWithCards}
        />
      </View>
    ) : (
      <>
        {shouldShowNoBeatablePlayHint && (
          <Text style={styles.hintText}>没有可以大过上家的牌</Text>
        )}
        <View style={styles.tableActionRow}>
          {shouldShowPassButton && (
            <TouchableOpacity
              style={[
                styles.tableActionButton,
                styles.tablePassButton,
                (!canOperateButtons || !canPass) && styles.buttonDisabled,
              ]}
              onPress={handlePass}
              disabled={!canOperateButtons || !canPass}
            >
              <Text style={styles.tableActionText}>不出</Text>
            </TouchableOpacity>
          )}
          {canOperateButtons && (
            <TouchableOpacity
              style={[
                styles.tableActionButton,
                styles.tableHintButton,
                !onHintRequest && styles.buttonDisabled,
              ]}
              onPress={handleHint}
              disabled={!onHintRequest}
            >
              <Text style={styles.tableHintActionText}>提示</Text>
            </TouchableOpacity>
          )}
          {canOperateButtons && (
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
          )}
          {selectedIds.length > 0 && (
            <TouchableOpacity
              style={[styles.tableActionButton, styles.tableClearButton]}
              onPress={handleClear}
            >
              <Text style={styles.tableActionText}>清除</Text>
            </TouchableOpacity>
          )}
        </View>
        <HandCards
          cards={sortedHand}
          selectedIds={selectedIds}
          onToggleSelect={toggleCard}
          actionable={canInteractWithCards}
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
  tableClearButton: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
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
  compactClearButton: {
    backgroundColor: "#EF4444",
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
  hintText: {
    color: "#FBBF24",
    fontSize: 16,
    fontFamily: PLAYFUL_FONT_FAMILY,
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
});
