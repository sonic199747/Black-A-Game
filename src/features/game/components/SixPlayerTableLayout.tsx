// src/features/game/components/SixPlayerTableLayout.tsx
import type { Card } from "@/features/game/engine/cards";
import { PlayerState } from "@/features/game/engine/gameEngineDemo";
import type { Play } from "@/features/game/engine/plays";
import type { RoomGameViewModel } from "@/features/multiplayer/types";
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

interface TablePlayerState extends PlayerState {
  isPlaceholder?: boolean;
  placeholderLabel?: string;
}

const MIN_SUPPORTED_PLAYERS = 1;
const MAX_SUPPORTED_PLAYERS = 6;

const seatLayouts: Record<number, SeatPosition[]> = {
  1: ["bottom"],
  2: ["bottom", "top"],
  3: ["bottom", "topRight", "topLeft"],
  4: ["bottom", "bottomRight", "top", "bottomLeft"],
  5: ["bottom", "bottomRight", "topRight", "topLeft", "bottomLeft"],
  6: ["bottom", "bottomRight", "topRight", "top", "topLeft", "bottomLeft"],
};

// 公共 props：manualPanel、最近出牌等
interface SixPlayerTableLayoutCommonProps {
  manualPanelProps?: ManualPlayerPanelProps | null;
  lastPlay?: Play | null;
  lastPlayOwnerName?: string;
}

// 座位准备状态（从 RoomState.seats 获取）
interface SeatReadyState {
  seatIndex: number;
  isReady: boolean;
}

// ✅ 支持两种用法：旧的（直接给 players），新的（传 viewModel）
export type SixPlayerTableLayoutProps =
  | (SixPlayerTableLayoutCommonProps & {
      players: TablePlayerState[]; // 按 game state 顺序排的玩家（可包含占位符）
      currentPlayerIndex: number; // 当前出牌玩家的索引
      selfIndex: number; // “我”在 players 数组里的索引
    })
  | (SixPlayerTableLayoutCommonProps & {
      viewModel: RoomGameViewModel; // 直接喂联机 / 本地的 ViewModel
    });

/**
 * 牌桌布局（纯 UI，可根据玩家人数自动调整）
 * - 自己永远在底部
 * - 其他玩家按顺时针 / 逆时针环绕
 */
export function SixPlayerTableLayout(props: SixPlayerTableLayoutProps) {
  const { manualPanelProps, lastPlay, lastPlayOwnerName } = props;

  let players: TablePlayerState[];
  let currentPlayerIndex: number;
  let selfIndex: number;
  let seatReadyStates: SeatReadyState[] = []; // 准备状态映射

  // 🔁 新用法：从 RoomGameViewModel 里取数据
  if ("viewModel" in props) {
    const { viewModel } = props;
    const gameState = viewModel.gameState;

    if (!gameState) {
      // 房间已连上但是游戏还没开始时的状态
      return (
        <View style={styles.fallback}>
          <Text>游戏尚未开始，等待房主开局...</Text>
        </View>
      );
    }

    players = gameState.players as TablePlayerState[];
    currentPlayerIndex = gameState.currentPlayerIndex;
    selfIndex = viewModel.mySeatIndex;

    // 从 roomState.players 提取准备状态
    seatReadyStates = (viewModel.roomState?.players ?? []).map((player) => ({
      seatIndex: player.seat,
      isReady: player.isReady ?? false,
    }));
  } else {
    // 🔁 旧用法：保持你之前的接口不变
    players = props.players;
    currentPlayerIndex = props.currentPlayerIndex;
    selfIndex = props.selfIndex;
  }

  const playerCount = players.length;

  if (playerCount < MIN_SUPPORTED_PLAYERS) {
    return (
      <View style={styles.fallback}>
        <Text>
          房间至少需要 {MIN_SUPPORTED_PLAYERS} 名玩家才能展示牌桌（当前{" "}
          {playerCount} 人）
        </Text>
      </View>
    );
  }

  if (playerCount > MAX_SUPPORTED_PLAYERS) {
    return (
      <View style={styles.fallback}>
        <Text>
          目前仅支持 {MAX_SUPPORTED_PLAYERS} 人以内的牌桌（当前 {playerCount}{" "}
          人）
        </Text>
      </View>
    );
  }

  const seatLayout = seatLayouts[playerCount];
  if (!seatLayout) {
    return (
      <View style={styles.fallback}>
        <Text>暂不支持 {playerCount} 人的牌桌布局</Text>
      </View>
    );
  }

  const seatAssignments = players.map((player, index) => {
    const relative = (index - selfIndex + players.length) % players.length;
    const seat = mapRelativeIndexToSeat(relative, seatLayout);
    const isCurrent = index === currentPlayerIndex;
    const isSelf = index === selfIndex;

    // 查找该座位的准备状态和AI状态（从 roomState 获取）
    const roomPlayer = seatReadyStates.find((s) => s.seatIndex === index);
    const isReady = roomPlayer?.isReady ?? false;
    // 从 viewModel.roomState.players 中查找isAI信息
    let isAI = false;
    if ("viewModel" in props && props.viewModel.roomState) {
      const rp = props.viewModel.roomState.players.find(
        (p) => p.seat === index
      );
      isAI = rp?.isAI ?? false;
    }

    return { player, seat, isCurrent, isSelf, isReady, isAI };
  });

  const manualProps =
    manualPanelProps && manualPanelProps.player ? manualPanelProps : null;
  const manualStatus = getManualStatusMessage(manualProps);

  return (
    <View style={styles.scene}>
      <View style={styles.tableWrapper}>
        <View style={styles.tableShadow} />
        <View style={styles.tableOuter}>
          <View style={styles.tableInner}>
            <CenterRecentPlay
              lastPlay={lastPlay}
              lastPlayOwnerName={lastPlayOwnerName}
              statusMessage={manualStatus}
            />
          </View>
        </View>

        {seatAssignments.map((assignment) => {
          // 有手牌操作面板时，不重复渲染底部自家座位
          if (assignment.isSelf && manualProps) return null;

          return (
            <View
              key={assignment.player.id}
              style={[styles.seatBase, seatPositionStyle[assignment.seat]]}
            >
              <PlayerSeat {...assignment} />
            </View>
          );
        })}

        {manualProps && (
          <View style={styles.bottomHandOverlay}>
            <ManualPlayerPanel {...manualProps} variant="standalone" />
          </View>
        )}
      </View>
    </View>
  );
}

function mapRelativeIndexToSeat(
  relativeIndex: number,
  layout: SeatPosition[]
): SeatPosition {
  if (!layout.length) {
    return "bottom";
  }
  const normalizedIndex = Math.min(relativeIndex, layout.length - 1);
  return layout[normalizedIndex] ?? "bottom";
}

type SeatOrientation = "top" | "bottom" | "left" | "right";

interface PlayerSeatProps {
  player: TablePlayerState;
  isCurrent: boolean;
  isSelf: boolean;
  seat: SeatPosition;
  isReady?: boolean; // 准备状态
  isAI?: boolean; // 是否为AI玩家
}

function PlayerSeat({
  player,
  isCurrent,
  isSelf,
  seat,
  isReady,
  isAI,
}: PlayerSeatProps) {
  const isPlaceholder = Boolean(player.isPlaceholder);
  const orientation = seatToOrientation(seat);
  const roleLabel = isPlaceholder
    ? "等待玩家入座"
    : isSelf
    ? "真人玩家"
    : isAI
    ? "AI对手"
    : "电脑对手";
  const avatarLetters = isPlaceholder
    ? player.placeholderLabel ?? "待"
    : player.name.length > 2
    ? player.name.slice(0, 2)
    : player.name;

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
        isPlaceholder && styles.placeholderSeat,
      ]}
    >
      <View style={styles.avatarContainer}>
        <View
          style={[
            styles.avatarWrapper,
            isSelf && styles.selfAvatar,
            isPlaceholder && styles.placeholderAvatar,
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              isSelf && styles.selfAvatarText,
              isPlaceholder && styles.placeholderAvatarText,
            ]}
          >
            {avatarLetters}
          </Text>
        </View>

        {/* 准备状态指示器 */}
        {!isPlaceholder && isReady !== undefined && (
          <View
            style={[
              styles.readyBadge,
              isReady ? styles.readyBadgeReady : styles.readyBadgeNotReady,
            ]}
          >
            <Text style={styles.readyBadgeText}>
              {isReady ? "✓" : "○"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.seatInfo}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.playerName, isSelf && styles.selfPlayerName]}
            numberOfLines={1}
          >
            {isPlaceholder
              ? player.name
              : isSelf
              ? `${player.name}（我）`
              : player.name}
          </Text>
          {!isPlaceholder && isAI && (
            <Text style={styles.aiBadge}>🤖</Text>
          )}
          {!isPlaceholder && player.hasBlackA && (
            <Text style={styles.blackABadge}>♠A</Text>
          )}
        </View>

        <View style={styles.roleRow}>
          <Text style={styles.roleLabel}>{roleLabel}</Text>
          {!isPlaceholder && (
            <View
              style={[
                styles.campTag,
                player.camp === "A" ? styles.campA : styles.campB,
              ]}
            >
              <Text style={styles.campText}>{player.camp} 阵营</Text>
            </View>
          )}
        </View>

        {isPlaceholder ? (
          <View style={styles.placeholderInfoRow}>
            <Text style={styles.placeholderInfoText}>空位 · 等待加入</Text>
          </View>
        ) : (
          <View style={styles.handRow}>
            <View style={styles.miniCards}>
              {renderMiniCards(player.hand.length)}
            </View>
            <Text style={styles.handCount}>{player.hand.length} 张</Text>
          </View>
        )}

        {!isPlaceholder && player.finished && (
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

function getManualStatusMessage(
  manualProps: ManualPlayerPanelProps | null
): string | null {
  if (!manualProps) return null;

  const { request, triggerPlayerName, player } = manualProps;
  if (!request) {
    return "等待电脑执行";
  }

  const anyRequest = request as any;
  const ctxType: string | undefined = anyRequest?.context?.type;
  const playerName = player?.name ?? "某位玩家";

  if (ctxType === "TURN") {
    return `轮到 ${playerName} 出牌`;
  }

  return triggerPlayerName
    ? `有人出完牌，问你要不要管（${triggerPlayerName}）`
    : "有人出完牌，问你要不要管";
}

interface CenterRecentPlayProps {
  lastPlay?: Play | null;
  lastPlayOwnerName?: string;
  statusMessage?: string | null;
}

function CenterRecentPlay({
  lastPlay,
  lastPlayOwnerName,
  statusMessage,
}: CenterRecentPlayProps) {
  const lastPlayCards: Card[] = lastPlay?.cards ?? [];
  const hasPlay = lastPlayCards.length > 0;

  return (
    <View style={styles.centerPlayRoot}>
      <View style={styles.centerPlayGlow} />
      <View style={styles.centerPlayPanel}>
        {statusMessage && (
          <View style={styles.centerStatusChip}>
            <Text style={styles.centerStatusChipText}>{statusMessage}</Text>
          </View>
        )}
        <Text style={styles.centerPlayTitle}>最近出牌</Text>
        {hasPlay ? (
          <>
            <Text style={styles.centerPlayOwner}>
              {lastPlayOwnerName ? `由 ${lastPlayOwnerName}` : "来自未知玩家"}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.centerPlayCardsRow}
              style={styles.centerPlayCardsScroll}
            >
              {lastPlayCards.map((card) => (
                <CardDisplay key={card.id} card={card} size="small" />
              ))}
            </ScrollView>
            <Text style={styles.centerPlayMeta}>
              {getPlayTypeLabel(lastPlay?.type)} · {lastPlayCards.length} 张
            </Text>
          </>
        ) : (
          <Text style={styles.centerPlayEmpty}>等待新的出牌...</Text>
        )}
      </View>
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
    marginTop: 0,
    marginBottom: 0,
    position: "relative",
    height: "100%",
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
  centerPlayRoot: {
    width: "80%",
    maxWidth: 520,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerPlayGlow: {
    position: "absolute",
    width: "110%",
    height: "110%",
    borderRadius: 360,
    backgroundColor: "rgba(250,204,21,0.2)",
    shadowColor: "#FDE68A",
    shadowOpacity: 0.35,
    shadowRadius: 40,
  },
  centerPlayPanel: {
    width: "100%",
    borderRadius: 42,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(5, 9, 20, 0.85)",
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  centerStatusChip: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.25)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.45)",
  },
  centerStatusChipText: {
    color: "#BBF7D0",
    fontWeight: "700",
    fontSize: 12,
  },
  centerPlayTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FCD34D",
  },
  centerPlayOwner: {
    color: "#E0E7FF",
    fontSize: 14,
  },
  centerPlayCardsScroll: {
    width: "100%",
  },
  centerPlayCardsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingVertical: 6,
  },
  centerPlayMeta: {
    color: "#94A3B8",
    fontSize: 13,
  },
  centerPlayEmpty: {
    color: "#CBD5F5",
    fontSize: 14,
    marginTop: 6,
  },
  bottomHandOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    paddingHorizontal: 24,
    alignItems: "center",
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
  placeholderSeat: {
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(15,23,42,0.3)",
  },
  avatarContainer: {
    position: "relative",
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
  readyBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  readyBadgeReady: {
    backgroundColor: "#10B981",
  },
  readyBadgeNotReady: {
    backgroundColor: "#6B7280",
  },
  readyBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  selfAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FDE047",
  },
  placeholderAvatar: {
    backgroundColor: "rgba(148,163,184,0.35)",
    borderColor: "rgba(148,163,184,0.4)",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7C2D12",
  },
  selfAvatarText: {
    fontSize: 20,
  },
  placeholderAvatarText: {
    color: "#E2E8F0",
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
  aiBadge: {
    fontSize: 14,
    marginLeft: 4,
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
    flex: 1,
  },
  placeholderInfoRow: {
    marginTop: 6,
  },
  placeholderInfoText: {
    color: "#CBD5F5",
    fontSize: 12,
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
