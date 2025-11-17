// src/features/game/components/SixPlayerTableLayout.tsx
import type { Card } from "@/features/game/engine/cards";
import { PlayerState } from "@/features/game/engine/gameEngineDemo";
import type { Play } from "@/features/game/engine/plays";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CardDisplay } from "./CardDisplay";
import { ManualPlayerPanel, ManualPlayerPanelProps } from "./ManualPlayerPanel";

type SeatPosition =
  | "bottom"
  | "bottomRight"
  | "topRight"
  | "top"
  | "topLeft"
  | "bottomLeft";

interface SixPlayerTableLayoutProps {
  players: PlayerState[]; // 按 game state 顺序排的 6 个玩家
  currentPlayerIndex: number; // 当前出牌玩家的索引
  selfIndex: number; // “我”在 players 数组里的索引
  manualPanelProps?: ManualPlayerPanelProps | null;
  lastPlay?: Play | null;
  lastPlayOwnerName?: string;
}

/**
 * 6 人牌桌布局（纯 UI）
 * - 自己永远在底部
 * - 其他玩家按顺时针 / 逆时针环绕
 */
export function SixPlayerTableLayout({
  players,
  currentPlayerIndex,
  selfIndex,
  manualPanelProps,
  lastPlay,
  lastPlayOwnerName,
}: SixPlayerTableLayoutProps) {
  if (players.length !== 6) {
    return (
      <View style={styles.fallback}>
        <Text>目前只支持 6 人牌桌</Text>
      </View>
    );
  }

  const seatAssignments = players.map((player, index) => {
    const relative = (index - selfIndex + players.length) % players.length;
    const seat = mapRelativeIndexToSeat(relative);
    const isCurrent = index === currentPlayerIndex;
    const isSelf = index === selfIndex;

    return { player, seat, isCurrent, isSelf };
  });

  const manualProps =
    manualPanelProps && manualPanelProps.player ? manualPanelProps : null;

  return (
    <View style={styles.scene}>
      <View style={styles.tableWrapper}>
        <View style={styles.tableShadow} />
        <View style={styles.tableOuter}>
          <View style={styles.tableInner}>
            <CentralControlArea
              manualProps={manualProps}
              lastPlay={lastPlay}
              lastPlayOwnerName={lastPlayOwnerName}
            />
          </View>
        </View>

        {seatAssignments.map((assignment) => {
          // Skip rendering the bottom self player seat, it will be shown in the central area
          if (assignment.isSelf) return null;

          return (
            <View
              key={assignment.player.id}
              style={[styles.seatBase, seatPositionStyle[assignment.seat]]}
            >
              <PlayerSeat {...assignment} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function mapRelativeIndexToSeat(relativeIndex: number): SeatPosition {
  switch (relativeIndex) {
    case 0:
      return "bottom";
    case 1:
      return "bottomRight";
    case 2:
      return "topRight";
    case 3:
      return "top";
    case 4:
      return "topLeft";
    case 5:
      return "bottomLeft";
    default:
      return "bottom";
  }
}

type SeatOrientation = "top" | "bottom" | "left" | "right";

interface PlayerSeatProps {
  player: PlayerState;
  isCurrent: boolean;
  isSelf: boolean;
  seat: SeatPosition;
}

function PlayerSeat({ player, isCurrent, isSelf, seat }: PlayerSeatProps) {
  const orientation = seatToOrientation(seat);
  const roleLabel = isSelf ? "真人玩家" : "电脑对手";
  const avatarLetters =
    player.name.length > 2 ? player.name.slice(0, 2) : player.name;

  // For self player (bottom), only show hand cards
  if (isSelf) {
    return (
      <View
        style={[
          styles.playerSeat,
          styles.playerSeatBottom,
          styles.selfSeatBottom,
        ]}
      ></View>
    );
  }

  return (
    <View
      style={[
        styles.playerSeat,
        orientation === "top" && styles.playerSeatTop,
        orientation === "bottom" && styles.playerSeatBottom,
        orientation === "left" && styles.playerSeatLeft,
        orientation === "right" && styles.playerSeatRight,
        isSelf && styles.selfSeat,
        isCurrent && styles.currentSeat,
      ]}
    >
      <View style={[styles.avatarWrapper, isSelf && styles.selfAvatar]}>
        <Text style={[styles.avatarText, isSelf && styles.selfAvatarText]}>
          {avatarLetters}
        </Text>
      </View>

      <View style={styles.seatInfo}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.playerName, isSelf && styles.selfPlayerName]}
            numberOfLines={1}
          >
            {isSelf ? `${player.name}（我）` : player.name}
          </Text>
          {player.hasBlackA && <Text style={styles.blackABadge}>♠A</Text>}
        </View>

        <View style={styles.roleRow}>
          <Text style={styles.roleLabel}>{roleLabel}</Text>
          <View
            style={[
              styles.campTag,
              player.camp === "A" ? styles.campA : styles.campB,
            ]}
          >
            <Text style={styles.campText}>{player.camp} 阵营</Text>
          </View>
        </View>

        <View style={styles.handRow}>
          <View style={styles.miniCards}>
            {renderMiniCards(player.hand.length)}
          </View>
          <Text style={styles.handCount}>{player.hand.length} 张</Text>
        </View>

        {player.finished && (
          <View style={styles.finishTag}>
            <Text style={styles.finishText}>
              第{player.finishOrder ?? 1}个出完
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function seatToOrientation(seat: SeatPosition): SeatOrientation {
  switch (seat) {
    case "bottom":
      return "bottom";
    case "top":
      return "top";
    case "bottomLeft":
    case "topLeft":
      return "left";
    default:
      return "right";
  }
}

function renderMiniCards(count: number) {
  const visible = Math.min(count, 5);
  return Array.from({ length: visible }).map((_, index) => (
    <View
      key={`mini-card-${index}`}
      style={[
        styles.miniCard,
        index > 0 && { marginLeft: -8 },
        index === visible - 1 && styles.miniCardTop,
      ]}
    />
  ));
}

function getPlayTypeLabel(playType?: Play["type"]): string {
  const labels: Record<string, string> = {
    SINGLE: "单张",
    PAIR: "对子",
    TRIPLE: "三张",
    STRAIGHT: "顺子",
    CHAIN_PAIR: "连对",
    CHAIN_TRIPLE: "连续三张",
    BOMB: "炸弹",
    JOKER_BOMB: "王炸",
  };
  return labels[playType || ""] || "未知";
}

interface CentralControlAreaProps {
  manualProps: ManualPlayerPanelProps | null;
  lastPlay?: Play | null;
  lastPlayOwnerName?: string;
}

function CentralControlArea({
  manualProps,
  lastPlay,
  lastPlayOwnerName,
}: CentralControlAreaProps) {
  const lastPlayCards: Card[] = lastPlay?.cards ?? [];

  return (
    <View style={styles.centerArea}>
      {lastPlay && (
        <View style={styles.lastPlayPanel}>
          <View style={styles.lastPlayHeader}>
            <Text style={styles.lastPlayTitle}>
              最近出牌 {lastPlayOwnerName ? `(${lastPlayOwnerName})` : ""}
            </Text>
            <Text style={styles.lastPlayMeta}>
              {getPlayTypeLabel(lastPlay.type)} · {lastPlay.cards.length} 张
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.lastPlayCardsRow}
          >
            {lastPlayCards.map((card) => (
              <CardDisplay key={card.id} card={card} size="small" />
            ))}
          </ScrollView>
        </View>
      )}

      {manualProps ? (
        <ScrollView
          style={styles.manualPanelScroll}
          contentContainerStyle={styles.manualPanelScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ManualPlayerPanel {...manualProps} variant="embedded" />
        </ScrollView>
      ) : (
        <View style={styles.centerInfoPlaceholder}>
          <Text style={styles.centerInfoTitle}>等待玩家进入</Text>
          <Text style={styles.centerInfoHint}>
            真人操作区会在你可行动时显示于此
          </Text>
        </View>
      )}
    </View>
  );
}

const seatPositionStyle: Record<SeatPosition, any> = {
  bottom: {
    bottom: 160,
    left: "50%",
    marginLeft: -260,
    width: 520,
  },
  bottomRight: {
    bottom: 340,
    right: -4,
    width: 240,
  },
  topRight: {
    top: 40,
    right: -4,
    width: 230,
  },
  top: {
    top: -10,
    left: "50%",
    marginLeft: -220,
    width: 440,
  },
  topLeft: {
    top: 40,
    left: -4,
    width: 230,
  },
  bottomLeft: {
    bottom: 340,
    left: -4,
    width: 240,
  },
};

const styles = StyleSheet.create({
  scene: {
    minHeight: 980,
    flex: 1,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 32,
    backgroundColor: "#041622",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    position: "relative",
    width: "100%",
  },
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tableWrapper: {
    flex: 1,
    marginTop: 0, // Removed margin to make the table fill the layout
    marginBottom: 0,
    position: "relative",
    height: "100%", // Adjusted height to fill the layout
    paddingHorizontal: 4,
  },
  tableShadow: {
    position: "absolute",
    top: 80,
    left: 28,
    right: 28,
    bottom: 120,
    borderRadius: 360,
    backgroundColor: "rgba(0,0,0,0.4)",
    transform: [{ scaleX: 1.08 }],
  },
  tableOuter: {
    position: "absolute",
    top: 12,
    bottom: 28,
    left: 12,
    right: 12,
    borderRadius: 360,
    backgroundColor: "#5A3314",
    borderWidth: 8,
    borderColor: "#8C5523",
    justifyContent: "center",
    alignItems: "center",
  },
  tableInner: {
    width: "98%",
    height: "96%",
    backgroundColor: "#7A4520",
    borderRadius: 360,
    borderWidth: 2,
    borderColor: "#D08547",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  centerInfoPlaceholder: {
    width: "85%",
    height: "72%",
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(7, 11, 19, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  centerInfoTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FCD34D",
    marginBottom: 12,
  },
  centerInfoHint: {
    fontSize: 14,
    color: "#E5E7EB",
    textAlign: "center",
    lineHeight: 20,
  },
  centerArea: {
    width: "95%",
    flex: 1,
    maxHeight: "90%",
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(5, 9, 20, 0.75)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: "flex-start",
  },
  lastPlayPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(17,24,39,0.75)",
    padding: 12,
    marginBottom: 12,
  },
  lastPlayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  lastPlayTitle: {
    color: "#FDE68A",
    fontWeight: "700",
    fontSize: 16,
  },
  lastPlayMeta: {
    color: "#E0E7FF",
    fontSize: 13,
  },
  lastPlayCardsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  manualPanelScroll: {
    flex: 1,
    width: "100%",
  },
  manualPanelScrollContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  seatBase: {
    position: "absolute",
  },
  playerSeat: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,23,42,0.55)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    position: "relative",
  },
  playerSeatTop: {
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  playerSeatBottom: {
    flexDirection: "row",
  },
  playerSeatLeft: {
    flexDirection: "row",
  },
  playerSeatRight: {
    flexDirection: "row-reverse",
  },
  selfSeat: {
    backgroundColor: "rgba(253,230,138,0.25)",
    borderColor: "#FCD34D",
  },
  selfSeatBottom: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
  },
  currentSeat: {
    borderColor: "#FACC15",
    shadowColor: "#FACC15",
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FBBF24",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FED7AA",
  },
  selfAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FDE047",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7C2D12",
  },
  selfAvatarText: {
    fontSize: 20,
  },
  seatInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  playerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    flexShrink: 1,
  },
  selfPlayerName: {
    fontSize: 16,
    color: "#FEF3C7",
  },
  blackABadge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#991B1B",
    color: "#FFFFFF",
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: 12,
    color: "#BFDBFE",
  },
  campTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  campA: {
    backgroundColor: "rgba(14,165,233,0.2)",
  },
  campB: {
    backgroundColor: "rgba(251,191,36,0.2)",
  },
  campText: {
    fontSize: 10,
    color: "#FFFFFF",
  },
  handRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1, // Make the handRow fill the available space
  },
  miniCards: {
    flexDirection: "row",
  },
  miniCard: {
    width: 18,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#94A3B8",
  },
  miniCardTop: {
    backgroundColor: "#FBBF24",
    borderColor: "#F59E0B",
  },
  handCount: {
    fontSize: 12,
    color: "#F8FAFC",
    fontWeight: "600",
  },
  finishTag: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(16,185,129,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  finishText: {
    fontSize: 11,
    color: "#6EE7B7",
  },
});
