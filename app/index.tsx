import {
  ControlButtons,
  GameResultPanel,
  GameStatusPanel,
  SixPlayerTableLayout,
  TopInfoBar,
  homeStyles,
  useNetworkGameState,
} from "@/features/game";
import type { ManualPlayerPanelProps } from "@/features/game/components/ManualPlayerPanel";
import type { PlayerState } from "@/features/game/engine/gameEngineDemo";
import { useFonts } from "expo-font";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const DEFAULT_MAX_PLAYERS = 6;
const MIN_TABLE_PLAYERS = 2;
const MAX_TABLE_PLAYERS = 6;
const AI_NAME_REGEX = /^电脑（(\d+)）$/;

type TablePlayerState = PlayerState & {
  isPlaceholder?: boolean;
  placeholderLabel?: string;
};

/**
 * 主屏幕组件 - 游戏主界面
 *
 * 结构：
 * 1. TopInfoBar - 游戏标题和快速统计
 * 2. ControlButtons - 重新开局和下一回合按钮
 * 3. GameStatusPanel - 实时游戏状态
 * 4. GameResultPanel - 游戏结束结算（条件渲染）
 * 5. TableLayout - 自适应座位布局
 */
export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    KeinannMaruPOP: require("../assets/fonts/KeinannMaruPOP.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return <HomeScreenContent />;
}

function HomeScreenContent() {
  const {
    state,
    rooms,
    roomId,
    selectRoom,
    createRoom,
    joinRoom,
    refreshRooms,
    connectionState,
    handleRestart,
    handleStartNextRound,
    handleNextTurn,
    manualRequest,
    submitManualDecision,
    manualPlayer,
    manualPlayerIndex,
    requestManualHint,
    lastResult,
    startGame: startNetworkGame,
  } = useNetworkGameState(DEFAULT_MAX_PLAYERS, {
    humanPlayerIndex: 0,
    displayName: "我",
    autoFillAI: false,
    autoJoinManualPlayer: false,
  });

  const players = state.players;
  const [joinDisplayName, setJoinDisplayName] = useState("我");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [roomMessage, setRoomMessage] = useState<string | null>(null);
  const [startingGame, setStartingGame] = useState(false);
  const aiNameTrackerRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (roomId && !joinRoomId) {
      setJoinRoomId(roomId);
    }
  }, [joinRoomId, roomId]);

  useEffect(() => {
    aiNameTrackerRef.current = new Set();
  }, [roomId]);

  useEffect(() => {
    state.players.forEach((player) => {
      if (AI_NAME_REGEX.test(player.name)) {
        aiNameTrackerRef.current.add(player.name);
      }
    });
  }, [state.players]);

  const rememberAiName = useCallback(
    (name: string) => {
      if (AI_NAME_REGEX.test(name)) {
        aiNameTrackerRef.current.add(name);
      }
    },
    []
  );

  const computeNextAiName = useCallback(() => {
    const used = new Set<number>();
    const addName = (name: string) => {
      const match = name.match(AI_NAME_REGEX);
      if (match) {
        used.add(Number(match[1]));
      }
    };
    aiNameTrackerRef.current.forEach(addName);
    state.players.forEach((player) => addName(player.name));
    let next = 1;
    while (used.has(next)) {
      next += 1;
    }
    return `电脑（${next}）`;
  }, [state.players]);

  const handleCreateRoom = useCallback(() => {
    createRoom().catch((error) => {
      console.warn("Failed to create room", error);
    });
  }, [createRoom]);

  const handleRefreshRooms = useCallback(() => {
    refreshRooms()
      .then(() => setRoomMessage("✅ 房间列表已刷新"))
      .catch((error) => {
        console.warn("Failed to refresh rooms", error);
        setRoomMessage(error?.message ?? "刷新房间列表失败");
      });
  }, [refreshRooms]);

  const handleJoinRoom = useCallback(
    (kind: "MANUAL" | "AI") => {
      const targetRoomId = joinRoomId.trim() || roomId;
      if (!targetRoomId) {
        setRoomMessage("请先创建或输入一个房间 ID");
        return;
      }
      const trimmedManual = joinDisplayName.trim();
      const nextName =
        kind === "MANUAL"
          ? trimmedManual || "手动玩家"
          : computeNextAiName();
      setRoomMessage("加入中...");
      joinRoom({
        roomId: targetRoomId,
        kind,
        displayName: nextName,
      })
        .then(() => {
          if (kind === "AI") {
            rememberAiName(nextName);
          }
          setRoomMessage(
            kind === "MANUAL"
              ? "已作为手动玩家加入当前房间"
              : "已添加一个 AI 座位"
          );
        })
        .catch((error) => {
          console.warn("Failed to join room", error);
          setRoomMessage(error?.message ?? "加入房间失败");
        });
    },
    [
      computeNextAiName,
      joinDisplayName,
      joinRoom,
      joinRoomId,
      rememberAiName,
      roomId,
    ]
  );

  const handleSelectRoomFromInput = useCallback(() => {
    const target = joinRoomId.trim();
    if (!target) {
      setRoomMessage("请输入有效的房间 ID");
      return;
    }
    selectRoom(target);
    setRoomMessage(`已切换到房间 ${target}`);
  }, [joinRoomId, selectRoom]);

  const activeRoomSummary = useMemo(() => {
    if (!roomId) return null;
    return rooms.find((room) => room.id === roomId) ?? null;
  }, [roomId, rooms]);

  const roomStatus = activeRoomSummary?.status ?? null;
  const targetMaxPlayers =
    activeRoomSummary?.maxPlayers ?? DEFAULT_MAX_PLAYERS;
  const joinedPlayerCount = activeRoomSummary?.playerCount ?? 0;
  const supportsRoomSize = targetMaxPlayers <= MAX_TABLE_PLAYERS;
  const roomHasLiveState =
    roomStatus === "RUNNING" || roomStatus === "FINISHED";

  const isManualMode = manualPlayerIndex !== null;

  const waitingForManual = Boolean(manualRequest);
  const manualDecisionRequest = manualRequest?.request ?? null;
  const triggerPlayerName =
    manualDecisionRequest?.context.triggerPlayerIndex !== undefined
      ? players[manualDecisionRequest.context.triggerPlayerIndex]?.name
      : undefined;

  const mustBeatCurrent =
    Boolean(state.lastPlay) &&
    manualPlayerIndex !== null &&
    Boolean(
      manualDecisionRequest?.context.type === "REACT" ||
        state.lastPlayOwnerIndex !== manualPlayerIndex
    );

  const manualPanelProps: ManualPlayerPanelProps | null =
    roomHasLiveState && manualPlayer
      ? {
          player: manualPlayer,
          request: manualDecisionRequest,
          lastPlay: state.lastPlay,
          mustBeatCurrent,
          triggerPlayerName,
          onSubmit: (cards) => submitManualDecision(cards),
          onPass: () => submitManualDecision(null),
          onHintRequest: requestManualHint,
        }
      : null;

  const waitingSeatTarget = Math.min(
    Math.max(targetMaxPlayers, MIN_TABLE_PLAYERS),
    MAX_TABLE_PLAYERS
  );
  const waitingSeats = useMemo<TablePlayerState[]>(() => {
    const activeJoined = Math.min(joinedPlayerCount, waitingSeatTarget);
    return Array.from({ length: waitingSeatTarget }, (_, index) => {
      const joined = index < activeJoined;
      return {
        id: `waiting-seat-${index}`,
        name: joined
          ? `已加入 · 座位 ${index + 1}`
          : `空位 ${index + 1}`,
        hand: [],
        finished: false,
        camp: "A",
        hasBlackA: false,
        isPlaceholder: !joined,
        placeholderLabel: joined ? `${index + 1}` : "空",
      };
    });
  }, [joinedPlayerCount, waitingSeatTarget]);

  const tablePlayers: TablePlayerState[] = roomHasLiveState
    ? (players as TablePlayerState[])
    : waitingSeats;
  const layoutPlayerCount = tablePlayers.length;
  const layoutWithinRange =
    layoutPlayerCount >= MIN_TABLE_PLAYERS &&
    layoutPlayerCount <= MAX_TABLE_PLAYERS;
  const showTableLayout =
    Boolean(activeRoomSummary) &&
    supportsRoomSize &&
    layoutWithinRange &&
    tablePlayers.length > 0;
  const displaySelfIndex =
    roomHasLiveState && manualPlayerIndex !== null ? manualPlayerIndex : 0;
  const displayCurrentPlayerIndex = roomHasLiveState
    ? state.currentPlayerIndex
    : 0;
  const lastPlayForLayout = roomHasLiveState ? state.lastPlay : null;
  const lastPlayOwnerNameForLayout =
    roomHasLiveState && state.lastPlayOwnerIndex !== null
      ? players[state.lastPlayOwnerIndex]?.name
      : undefined;
  const tablePlaceholderMessage = !activeRoomSummary
    ? "请选择或创建一个房间以查看座位布局"
    : !supportsRoomSize
    ? `当前房间设置为 ${targetMaxPlayers} 人局，暂未支持该布局`
    : tablePlayers.length < MIN_TABLE_PLAYERS
    ? `当前人数不足以展示座位布局`
    : "座位布局暂不可用";

  const waitingForEnoughPlayers = joinedPlayerCount < targetMaxPlayers;
  const canStartGame =
    Boolean(activeRoomSummary) &&
    roomStatus === "WAITING" &&
    joinedPlayerCount >= targetMaxPlayers;
  const startButtonLabel = !activeRoomSummary
    ? "选择房间"
    : roomStatus === "RUNNING"
    ? "已开始"
    : startingGame
    ? "开始中..."
    : canStartGame
    ? "开始游戏"
    : "等待加入";
  const startButtonDisabled = !canStartGame || startingGame;

  const handleStartGame = useCallback(() => {
    if (!roomId || !canStartGame) return;
    setStartingGame(true);
    startNetworkGame(roomId)
      .then(() => {
        setRoomMessage("🎮 房间已开始");
      })
      .catch((error) => {
        console.warn("Failed to start game", error);
        setRoomMessage(error?.message ?? "无法开始游戏");
      })
      .finally(() => {
        setStartingGame(false);
      });
  }, [canStartGame, roomId, startNetworkGame]);

  return (
    <ScrollView
      style={homeStyles.container}
      contentContainerStyle={homeStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={homeStyles.roomManagerContainer}>
        <View style={homeStyles.roomManagerHeader}>
          <Text style={homeStyles.roomManagerTitle}>房间管理</Text>
          <TouchableOpacity
            style={homeStyles.roomCreateButton}
            onPress={handleCreateRoom}
          >
            <Text style={homeStyles.roomCreateButtonText}>➕ 新建房间</Text>
          </TouchableOpacity>
        </View>
        <Text style={homeStyles.connectionStatus}>
          网关：{connectionState === "connected" ? "已连接" : "连接中..."}
        </Text>
        <TouchableOpacity
          style={homeStyles.refreshButton}
          onPress={handleRefreshRooms}
        >
          <Text style={homeStyles.refreshButtonText}>↻ 刷新房间列表</Text>
        </TouchableOpacity>
        <View style={homeStyles.roomList}>
          {rooms.map((summary) => {
            const active = summary.id === roomId;
            return (
              <TouchableOpacity
                key={summary.id}
                style={[
                  homeStyles.roomBadge,
                  active && homeStyles.roomBadgeActive,
                ]}
                onPress={() => {
                  selectRoom(summary.id);
                  setJoinRoomId(summary.id);
                  setRoomMessage(null);
                }}
              >
                <Text
                  style={[
                    homeStyles.roomBadgeText,
                    active && homeStyles.roomBadgeTextActive,
                  ]}
                >
                  {summary.label ?? `房间 ${summary.id.slice(-4)}`}
                </Text>
                {summary && (
                  <Text
                    style={[
                      homeStyles.roomBadgeStatus,
                      active && homeStyles.roomBadgeStatusActive,
                    ]}
                  >
                    {summary.status === "FINISHED"
                      ? "已结束"
                      : summary.waitingForManual
                      ? "等待手动"
                      : summary.status === "RUNNING"
                      ? "进行中"
                      : "待开始"}
                    {" · "}
                    {summary.playerCount}/{summary.maxPlayers}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {rooms.length > 0 ? (
          <View style={homeStyles.roomSummaryGrid}>
            {rooms.map((summary) => (
              <View
                key={`${summary.id}-summary`}
                style={homeStyles.roomSummaryCard}
              >
                <Text style={homeStyles.roomSummaryTitle}>
                  {summary.label ?? `房间 ${summary.id.slice(-4)}`}
                </Text>
                <Text style={homeStyles.roomSummaryText}>
                  状态：{summary.status} · 人数 {summary.playerCount}/
                  {summary.maxPlayers}
                </Text>
                <Text style={homeStyles.roomSummaryText}>
                  当前玩家：{summary.currentPlayerName ?? "—"}
                </Text>
                {summary.manualHistory && summary.manualHistory.length > 0 ? (
                  <Text style={homeStyles.roomSummaryNote}>
                    最近手动：{summary.manualHistory[0].action}
                  </Text>
                ) : (
                  <Text style={homeStyles.roomSummaryNote}>暂无手动记录</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={homeStyles.roomSummaryNote}>
            暂无房间，点击“新建房间”开始
          </Text>
        )}
        <View style={homeStyles.joinControls}>
          <Text style={homeStyles.joinControlsTitle}>加入当前房间</Text>
          <TextInput
            style={homeStyles.joinInput}
            value={joinRoomId}
            onChangeText={setJoinRoomId}
            placeholder="房间 ID（可输入其他设备提供的 ID）"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[homeStyles.joinButton, homeStyles.joinSelectButton]}
            onPress={handleSelectRoomFromInput}
          >
            <Text style={homeStyles.joinButtonText}>切换到该房间</Text>
          </TouchableOpacity>
          <TextInput
            style={homeStyles.joinInput}
            value={joinDisplayName}
            onChangeText={setJoinDisplayName}
            placeholder="显示名称"
            placeholderTextColor="#94A3B8"
          />
          <View style={homeStyles.joinButtonRow}>
            <TouchableOpacity
              style={[homeStyles.joinButton, homeStyles.joinManualButton]}
              onPress={() => handleJoinRoom("MANUAL")}
            >
              <Text style={homeStyles.joinButtonText}>作为手动玩家加入</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[homeStyles.joinButton, homeStyles.joinAiButton]}
              onPress={() => handleJoinRoom("AI")}
            >
              <Text style={homeStyles.joinButtonText}>添加 AI 座位</Text>
            </TouchableOpacity>
          </View>
          {roomMessage && (
            <Text style={homeStyles.joinStatus}>{roomMessage}</Text>
          )}
        </View>
      </View>

      {/* ===== 顶部信息栏 ===== */}
      <TopInfoBar />

      {/* ===== 控制按钮 ===== */}
      <ControlButtons
        gameOver={state.gameOver}
        onRestart={handleRestart}
        onStartNextRound={handleStartNextRound}
        onNextTurn={handleNextTurn}
        isManualMode={isManualMode}
        waitingForManual={waitingForManual}
      />

      {/* ===== 游戏状态面板 ===== */}
      <GameStatusPanel state={state} />

      {/* ===== 游戏结算面板（游戏结束时显示）===== */}
      {state.gameOver && (
        <GameResultPanel result={lastResult} players={players} />
      )}

      {/* ===== 座位布局 ===== */}
      <View style={homeStyles.tableSection}>
        <Text style={homeStyles.tableTitle}>👥 座位布局</Text>
        <View style={homeStyles.tableStatusRow}>
          <View>
            <Text style={homeStyles.tableCountLabel}>
              当前人数：{joinedPlayerCount}/{targetMaxPlayers}
            </Text>
            <Text style={homeStyles.tableCountSubLabel}>
              {!activeRoomSummary
                ? "请选择一个房间"
                : roomStatus === "RUNNING"
                ? "牌局进行中"
                : waitingForEnoughPlayers
                ? "等待玩家加入"
                : "可开始游戏"}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              homeStyles.startGameButton,
              startButtonDisabled && homeStyles.startGameButtonDisabled,
            ]}
            onPress={handleStartGame}
            disabled={startButtonDisabled}
          >
            <Text
              style={[
                homeStyles.startGameButtonText,
                startButtonDisabled && homeStyles.startGameButtonTextDisabled,
              ]}
            >
              {startButtonLabel}
            </Text>
          </TouchableOpacity>
        </View>
        {showTableLayout ? (
          <SixPlayerTableLayout
            players={tablePlayers}
            currentPlayerIndex={displayCurrentPlayerIndex}
            selfIndex={displaySelfIndex}
            manualPanelProps={manualPanelProps}
            lastPlay={lastPlayForLayout}
            lastPlayOwnerName={lastPlayOwnerNameForLayout}
          />
        ) : (
          <Text style={homeStyles.roomSummaryNote}>
            {tablePlaceholderMessage}
          </Text>
        )}
      </View>

      {/* ===== 底部间距 ===== */}
      <View style={homeStyles.bottomSpacer} />
    </ScrollView>
  );
}
