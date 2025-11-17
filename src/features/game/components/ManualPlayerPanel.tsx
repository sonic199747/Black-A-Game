import { Card, compareCard } from "@/features/game/engine/cards";
import { PlayerState } from "@/features/game/engine/gameEngineDemo";
import { ManualDecisionRequest } from "@/features/game/engine/manualController";
import { Play, canBeat, classifyPlay } from "@/features/game/engine/plays";
import { ManualActionLogEntry } from "@/features/game/hooks/useGameState";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CardDisplay } from "./CardDisplay";
import { HandCards } from "./HandCards";

const PLAY_TYPE_LABELS: Record<string, string> = {
  SINGLE: "单张",
  PAIR: "对子",
  TRIPLE: "三张",
  STRAIGHT: "顺子",
  CHAIN_PAIR: "连对",
  CHAIN_TRIPLE: "连三",
  BOMB: "炸弹",
  JOKER_BOMB: "王炸",
};

interface ManualPlayerPanelProps {
  player: PlayerState | null;
  request: ManualDecisionRequest | null;
  lastPlay: Play | null;
  mustBeatCurrent: boolean;
  triggerPlayerName?: string;
  history?: ManualActionLogEntry[];
  onSubmit: (cards: Card[]) => void;
  onPass: () => void;
  onHintRequest?: () => Card[] | null;
}

export function ManualPlayerPanel({
  player,
  request,
  lastPlay,
  mustBeatCurrent,
  triggerPlayerName,
  history,
  onSubmit,
  onPass,
  onHintRequest,
}: ManualPlayerPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  const actionable = Boolean(request && player);

  const askPrompt = triggerPlayerName
    ? "有人出完牌，问你要不要管（" + triggerPlayerName + "）"
    : "有人出完牌，问你要不要管";

  const title = request
    ? request.context.type === "TURN"
      ? "轮到你出牌啦"
      : askPrompt
    : "等待电脑执行";

  const getPlayTypeLabel = (type?: string) =>
    type ? PLAY_TYPE_LABELS[type] ?? type : "";

  const sortedHand = useMemo(() => {
    if (!player) return [];
    return [...player.hand].sort(compareCard);
  }, [player]);
  const recentHistory = history?.slice(0, 4) ?? [];

  type QuickSelection = {
    key: string;
    label: string;
    cards: Card[];
  };

  const quickSelections: QuickSelection[] = useMemo(() => {
    if (!player) return [];
    const selections: QuickSelection[] = [];

    if (sortedHand.length > 0) {
      selections.push({
        key: "single",
        label: "🃏 最小单张",
        cards: [sortedHand[0]],
      });
    }

    const rankOrder: string[] = [];
    const rankBuckets = new Map<string, Card[]>();
    sortedHand.forEach((card) => {
      const bucket = rankBuckets.get(card.rank);
      if (bucket) {
        bucket.push(card);
      } else {
        rankOrder.push(card.rank);
        rankBuckets.set(card.rank, [card]);
      }
    });

    const findByCount = (count: number) => {
      for (const rank of rankOrder) {
        const bucket = rankBuckets.get(rank);
        if (bucket && bucket.length >= count) {
          return bucket.slice(0, count);
        }
      }
      return null;
    };

    const pair = findByCount(2);
    if (pair) {
      selections.push({
        key: "pair",
        label: "👯 最小对子",
        cards: pair,
      });
    }

    const triple = findByCount(3);
    if (triple) {
      selections.push({
        key: "triple",
        label: "🔱 最小三张",
        cards: triple,
      });
    }

    const bomb = (() => {
      for (const rank of rankOrder) {
        const bucket = rankBuckets.get(rank);
        if (bucket && bucket.length >= 4) {
          return bucket.slice(0, 4);
        }
      }
      return null;
    })();
    if (bomb) {
      selections.push({
        key: "bomb",
        label: "💣 炸弹",
        cards: bomb,
      });
    }

    const smallJoker = player.hand.find((c) => c.rank === "SJ");
    const bigJoker = player.hand.find((c) => c.rank === "BJ");
    if (smallJoker && bigJoker) {
      selections.push({
        key: "joker",
        label: "🂿 王炸",
        cards: [smallJoker, bigJoker],
      });
    }

    return selections;
  }, [player, sortedHand]);

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

  const selectionHint = (() => {
    if (!actionable) return "等待电脑执行...";
    if (selectedCards.length === 0) return "请选择要出的牌";
    if (!selectionPlay) return "当前选择不是合法牌型";
    if (!meetsTableRequirement) return "这手牌还压不住当前牌面";
    return (
      getPlayTypeLabel(selectionPlay.type) +
      " · " +
      selectedCards.length +
      " 张"
    );
  })();

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

  const clearSelection = () => {
    if (!selectedIds.length) return;
    setSelectedIds([]);
  };

  const applyQuickSelection = (cards: Card[]) => {
    if (!actionable || cards.length === 0) return;
    Haptics.selectionAsync().catch(() => {});
    setSelectedIds(cards.map((card) => card.id));
    const classified = classifyPlay(cards);
    if (classified) {
      setHintMessage(
        `已快速选中：${getPlayTypeLabel(classified.type)} · ${cards.length} 张`
      );
    } else {
      setHintMessage("已快速选中组合");
    }
  };

  const handleSubmit = () => {
    if (!player || !request || !canSubmit || selectedCards.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedIds([]);
    setHintMessage(null);
    onSubmit(selectedCards);
  };

  const handlePass = () => {
    if (!request) return;
    Haptics.selectionAsync().catch(() => {});
    setSelectedIds([]);
    setHintMessage(null);
    onPass();
  };

  const handleHint = () => {
    if (!actionable || !onHintRequest) return;
    const recommendation = onHintRequest();
    if (recommendation && recommendation.length > 0) {
      const ids = recommendation.map((card) => card.id);
      setSelectedIds(ids);
      const classified = classifyPlay(recommendation);
      if (classified) {
        setHintMessage(
          `推荐：${getPlayTypeLabel(classified.type)} · ${
            recommendation.length
          } 张`
        );
      } else {
        setHintMessage("已为你选中推荐组合");
      }
    } else {
      setSelectedIds([]);
      setHintMessage("推荐 PASS（暂无可出牌组合）");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>🂡 真人操作区</Text>
        {player && (
          <Text style={styles.subtitle}>
            {player.name +
              " · " +
              player.hand.length +
              " 张牌 · 阵营 " +
              player.camp}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.statusBadge,
          actionable ? styles.statusActive : styles.statusIdle,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            actionable ? styles.statusTextActive : styles.statusTextIdle,
          ]}
        >
          {title}
        </Text>
      </View>

      {lastPlay && request && (
        <View style={styles.referenceBox}>
          <Text style={styles.referenceTitle}>
            {mustBeatCurrent ? "需要压住的牌" : "上一手参考"}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.referenceCards}>
              {lastPlay.cards.map((card) => (
                <CardDisplay key={card.id} card={card} size="small" />
              ))}
            </View>
          </ScrollView>
          <Text style={styles.referenceMeta}>
            {getPlayTypeLabel(lastPlay.type) +
              " · " +
              lastPlay.cards.length +
              " 张"}
          </Text>
        </View>
      )}

      {quickSelections.length > 0 && (
        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>⚡️ 快速选牌</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActions}
          >
            {quickSelections.map((action) => {
              const actionSelected =
                selectedIds.length === action.cards.length &&
                action.cards.every((card) => selectedIds.includes(card.id));
              return (
                <TouchableOpacity
                  key={action.key}
                  style={[
                    styles.quickActionButton,
                    actionSelected && styles.quickActionActive,
                  ]}
                  onPress={() => applyQuickSelection(action.cards)}
                  disabled={!actionable}
                >
                  <Text
                    style={[
                      styles.quickActionText,
                      actionSelected && styles.quickActionTextActive,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.handSection}>
        <View style={styles.handHeader}>
          <Text style={styles.handTitle}>手牌</Text>
          {actionable ? (
            <Text style={styles.handHint}>
              {"点击卡牌可以选中/取消（已选 " + selectedIds.length + " 张）"}
            </Text>
          ) : (
            <Text style={styles.handHint}>等待电脑操作中...</Text>
          )}
        </View>
        <HandCards
          cards={sortedHand}
          selectedIds={selectedIds}
          onToggleSelect={toggleCard}
          actionable={actionable}
        />
      </View>

      <View style={styles.selectionSummary}>
        <Text style={styles.selectionHint}>{selectionHint}</Text>
        <TouchableOpacity
          onPress={clearSelection}
          style={[
            styles.clearButton,
            (!actionable || selectedIds.length === 0) && styles.buttonDisabled,
          ]}
          disabled={!actionable || selectedIds.length === 0}
        >
          <Text style={styles.clearButtonText}>清空选择</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.passButton,
            !actionable && styles.buttonDisabled,
          ]}
          onPress={handlePass}
          disabled={!actionable}
        >
          <Text style={styles.actionText}>不要 / PASS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.hintButton,
            (!actionable || !onHintRequest) && styles.buttonDisabled,
          ]}
          onPress={handleHint}
          disabled={!actionable || !onHintRequest}
        >
          <Text style={[styles.actionText, styles.hintButtonText]}>
            💡 提示
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.playButton,
            (!canSubmit || selectedCards.length === 0) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.actionText}>出牌</Text>
        </TouchableOpacity>
      </View>
      {hintMessage && <Text style={styles.hintMessage}>{hintMessage}</Text>}

      {recentHistory.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>📝 我的操作记录</Text>
          {recentHistory.map((entry) => (
            <View key={entry.id} style={styles.historyItem}>
              <View style={styles.historyMetaRow}>
                <Text style={styles.historyActionText}>
                  {formatHistoryAction(entry, getPlayTypeLabel)}
                </Text>
                <Text style={styles.historyTimeText}>
                  {formatHistoryTime(entry.timestamp)}
                </Text>
              </View>
              {entry.note && (
                <Text style={styles.historyNoteText}>{entry.note}</Text>
              )}
              {entry.cards.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.historyCardsRow}
                >
                  {entry.cards.map((card) => (
                    <CardDisplay
                      key={`${entry.id}-${card.id}`}
                      card={card}
                      size="small"
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function formatHistoryAction(
  entry: ManualActionLogEntry,
  getLabel: (type?: string) => string
) {
  if (entry.action === "PLAY") {
    const label = getLabel(entry.playType);
    return label
      ? `出牌 · ${label} · ${entry.cards.length} 张`
      : `出牌 · ${entry.cards.length} 张`;
  }
  if (entry.action === "HINT") {
    return entry.cards.length
      ? `提示 · ${getLabel(entry.playType)}`
      : "提示 · PASS";
  }
  return "PASS";
}

function formatHistoryTime(timestamp: number) {
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
  },
  headerRow: {
    marginBottom: 8,
  },
  title: {
    color: "#FACC15",
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: "#CBD5F5",
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  statusActive: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "#34D399",
  },
  statusIdle: {
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    borderWidth: 1,
    borderColor: "#94A3B8",
  },
  statusText: {
    fontWeight: "600",
  },
  statusTextActive: {
    color: "#6EE7B7",
  },
  statusTextIdle: {
    color: "#CBD5F5",
  },
  referenceBox: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  referenceTitle: {
    color: "#E2E8F0",
    fontWeight: "700",
    marginBottom: 8,
  },
  referenceCards: {
    flexDirection: "row",
    gap: 6,
  },
  referenceMeta: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 8,
  },
  handSection: {
    marginTop: 100, // 原来如果是 8、12 之类，直接换成 40
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 12,
    padding: 12,
  },
  handHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  handTitle: {
    color: "#F8FAFC",
    fontWeight: "700",
  },
  handHint: {
    color: "#94A3B8",
    fontSize: 12,
  },
  handCards: {
    flexDirection: "row",
    gap: 8,
  },
  emptyHand: {
    color: "#F8FAFC",
  },
  cardWrapper: {
    borderRadius: 12,
    padding: 4,
  },
  cardWrapperSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.25)",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  selectionSummary: {
    marginTop: 12,
    marginBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectionHint: {
    color: "#E2E8F0",
    fontSize: 13,
    flex: 1,
    marginRight: 12,
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FBBF24",
  },
  clearButtonText: {
    color: "#FBBF24",
    fontWeight: "600",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  passButton: {
    backgroundColor: "#64748B",
  },
  hintButton: {
    backgroundColor: "#FBBF24",
  },
  playButton: {
    backgroundColor: "#22C55E",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  hintButtonText: {
    color: "#0F172A",
  },
  hintMessage: {
    color: "#FBBF24",
    marginTop: 8,
    fontSize: 12,
  },
  quickSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  quickTitle: {
    color: "#9CA3AF",
    fontSize: 12,
    marginBottom: 6,
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
  },
  quickActionButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#475569",
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  quickActionActive: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderColor: "#22C55E",
  },
  quickActionText: {
    color: "#E2E8F0",
    fontSize: 12,
  },
  quickActionTextActive: {
    color: "#22C55E",
    fontWeight: "700",
  },
  historySection: {
    marginTop: 16,
    backgroundColor: "rgba(15,23,42,0.45)",
    borderRadius: 12,
    padding: 12,
  },
  historyTitle: {
    color: "#E2E8F0",
    fontWeight: "700",
    marginBottom: 8,
  },
  historyItem: {
    marginBottom: 10,
  },
  historyMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyActionText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "600",
  },
  historyTimeText: {
    color: "#94A3B8",
    fontSize: 11,
  },
  historyNoteText: {
    color: "#EAB308",
    fontSize: 12,
    marginTop: 4,
  },
  historyCardsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
});
