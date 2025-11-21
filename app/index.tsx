import type {
  DecisionContext,
  GameState as EngineGameState,
} from "@/shared/gameEngine/gameEngineDemo";
import { recommendPlay } from "@/shared/gameEngine/gameEngineDemo";
import { useFonts } from "expo-font";

import React, { useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";

import {
  Card,
  ControlButtons,
  GameResultPanel,
  GameStatusPanel,
  SixPlayerTableLayout,
  TopInfoBar,
  homeStyles,
} from "@/features/game";
import { ConnectionStatus } from "@/features/game/components/ConnectionStatus";
import type { ManualPlayerPanelProps } from "@/features/game/components/ManualPlayerPanel";
import { RoomSelector } from "@/features/game/components/RoomSelector";
import { useGameState } from "@/features/game/hooks/useGameState";
import { useNetworkRoomGame } from "@/features/multiplayer/hooks/useNetworkRoomGame";

const PLAYER_COUNT = 6;

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    KeinannMaruPOP: require("../assets/fonts/KeinannMaruPOP.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return <HomeScreenContent />;
}

// 用 gameEngineDemo 里的 recommendPlay + 决策上下文，
// 适配成给 ManualPlayerPanel 用的提示结构
type ManualRequest = NonNullable<ManualPlayerPanelProps["request"]>;

/**
 * 用 shared demo 引擎里的 recommendPlay，
 * 给 ManualPlayerPanel 提供：推荐牌 + 是否有可管牌
 */
function getRecommendationForManual(
  state: EngineGameState,
  request: ManualRequest
): { recommendedCards: Card[] | null; hasBeatablePlay: boolean } {
  const ctx: DecisionContext = {
    type: request.type === "REACT" ? "REACT" : "TURN",
  };

  const anyReq = request as any;
  if (typeof anyReq.triggerPlayerIndex === "number") {
    ctx.triggerPlayerIndex = anyReq.triggerPlayerIndex;
  } else if (
    anyReq.context &&
    typeof anyReq.context.triggerPlayerIndex === "number"
  ) {
    ctx.triggerPlayerIndex = anyReq.context.triggerPlayerIndex;
  }

  const cards = recommendPlay(state, request.playerIndex, ctx) ?? null;

  return {
    recommendedCards: cards,
    hasBeatablePlay: !!cards && cards.length > 0,
  };
}

function HomeScreenContent() {
  // 模式切换：本地 / 联机
  const [mode, setMode] = useState<"local" | "online">("local");

  // 联机房间设置
  const [onlineRoomId, setOnlineRoomId] = useState<string>("temp-room");
  const [onlineDisplayName, setOnlineDisplayName] = useState<string>("玩家");
  const [showRoomSelector, setShowRoomSelector] = useState(true);

  // 本地游戏状态（你原来的逻辑）
  const {
    state: localState,
    pendingManual,
    playCards,
    pass,
    restart,
  } = useGameState(PLAYER_COUNT);

  // 联机房间 ViewModel（只在选择了真实房间后才激活）
  const onlineVm = useNetworkRoomGame(onlineRoomId, onlineDisplayName);

  // 当切换到联机模式时，如果没有房间ID，显示房间选择器
  const handleJoinRoom = (roomId: string, displayName: string) => {
    setOnlineRoomId(roomId);
    setOnlineDisplayName(displayName);
    setShowRoomSelector(false);
  };

  const isManualMode = mode === "local";
  const waitingForManual = mode === "local" && !!pendingManual;

  // 本地模式：state 还没初始化时的占位
  if (mode === "local" && !localState) {
    return (
      <View style={homeStyles.container}>
        <TopInfoBar />
        <Text style={homeStyles.tableTitle}>抓黑A · 本地测试版</Text>
        <Text style={homeStyles.roomSummaryNote}>正在初始化游戏状态…</Text>
      </View>
    );
  }

  // ------- 本地模式：构建 ManualPanel / 各种面板 -------

  let manualPanelProps: ManualPlayerPanelProps | null = null;
  let lastPlayOwnerName: string | undefined = undefined;

  if (mode === "local" && localState) {
    const players = localState.players;
    const manualPlayerIndex = 0; // 约定你是 P1
    const manualPlayer = players[manualPlayerIndex];

    lastPlayOwnerName =
      localState.lastPlayOwnerIndex != null
        ? players[localState.lastPlayOwnerIndex]?.name
        : undefined;

    const mustBeatCurrent = pendingManual?.type === "REACT";

    if (pendingManual && manualPlayer) {
      const { recommendedCards, hasBeatablePlay } = getRecommendationForManual(
        localState as unknown as EngineGameState,
        pendingManual
      );

      manualPanelProps = {
        player: manualPlayer,
        request: pendingManual,
        lastPlay: localState.lastPlay,
        mustBeatCurrent,
        hasBeatablePlay,
        triggerPlayerName: lastPlayOwnerName,
        onSubmit: (cards) => {
          if (!cards || cards.length === 0) return;
          playCards(cards);
        },
        onPass: () => {
          pass();
        },
        onHintRequest: async (): Promise<Card[] | null> => {
          return recommendedCards ?? null;
        },
      };
    }
  }

  // ------- 渲染 -------

  return (
    <ScrollView
      style={homeStyles.container}
      contentContainerStyle={homeStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 顶部信息栏 */}
      <TopInfoBar />

      {/* 模式切换 + 当前状态提示 */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
          marginBottom: 4,
          paddingHorizontal: 8,
        }}
      >
        <Text style={homeStyles.roomSummaryNote}>
          当前模式：
          {mode === "local" ? "本地测试（单机）" : "联机房间（gateway）"}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            title="本地"
            onPress={() => setMode("local")}
            disabled={mode === "local"}
          />
          <Button
            title="联机"
            onPress={() => setMode("online")}
            disabled={mode === "online"}
          />
        </View>
      </View>

      {mode === "local" && localState && (
        <>
          {/* 控制按钮：本地版只真正用到 Restart，其余先占位 */}
          <ControlButtons
            gameOver={localState.gameOver}
            onRestart={restart}
            onStartNextRound={() => {
              restart();
            }}
            onNextTurn={() => {
              // 新引擎里回合推进是自动完成的，这里先放空
            }}
            isManualMode={isManualMode}
            waitingForManual={waitingForManual}
          />

          {/* 游戏状态面板 */}
          <GameStatusPanel state={localState} />

          {/* 游戏结束结算面板 */}
          {localState.gameOver && localState.result && (
            <GameResultPanel
              result={localState.result}
              players={localState.players}
            />
          )}

          {/* 座位布局 + 手动操作面板（本地） */}
          <View style={homeStyles.tableSection}>
            <Text style={homeStyles.tableTitle}>👥 六人牌桌 · 本地</Text>

            <SixPlayerTableLayout
              players={localState.players}
              currentPlayerIndex={localState.currentPlayerIndex}
              selfIndex={0}
              manualPanelProps={manualPanelProps}
              lastPlay={localState.lastPlay}
              lastPlayOwnerName={lastPlayOwnerName}
            />
          </View>
        </>
      )}

      {mode === "online" && (
        <>
          {/* 连接状态 */}
          <ConnectionStatus
            state={onlineVm.connectionState}
            onReconnect={() => {
              // 重连逻辑
              setShowRoomSelector(true);
              setOnlineRoomId("temp-room");
            }}
          />

          {/* 房间选择器 */}
          {showRoomSelector && (
            <RoomSelector
              onJoinRoom={handleJoinRoom}
              defaultDisplayName={onlineDisplayName}
            />
          )}

          {/* 已加入房间后的信息 */}
          {!showRoomSelector && onlineRoomId !== "temp-room" && (
            <>
              <View
                style={{
                  padding: 12,
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  borderRadius: 8,
                  marginVertical: 8,
                }}
              >
                <Text style={homeStyles.roomSummaryNote}>
                  房间：{onlineVm.roomState.roomId} · 玩家数：
                  {onlineVm.roomState.players.length} · 我的座位：
                  {onlineVm.mySeatIndex}
                </Text>
                <Button
                  title="退出房间"
                  onPress={() => {
                    setShowRoomSelector(true);
                    setOnlineRoomId("temp-room");
                  }}
                  color="#EF4444"
                />
              </View>
            </>
          )}

          {/* 准备状态统计（只在已加入房间后显示） */}
          {!showRoomSelector &&
            onlineRoomId !== "temp-room" &&
            (() => {
              const players = onlineVm.roomState?.players ?? [];
              const readyCount = players.filter((p) => p.isReady).length;
              const totalPlayers = players.length;
              const allReady =
                readyCount === totalPlayers && totalPlayers === PLAYER_COUNT;
              const canAddAI = totalPlayers < PLAYER_COUNT;

              // 当前玩家的准备状态
              const myPlayer = players.find(
                (p) => p.seat === onlineVm.mySeatIndex
              );
              const myReadyState = myPlayer?.isReady ?? false;

              // 统计AI数量
              const aiCount = players.filter((p) => p.isAI).length;
              const humanCount = totalPlayers - aiCount;

              return (
                <View
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(59, 130, 246, 0.3)",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 16,
                          fontWeight: "600",
                          marginBottom: 4,
                        }}
                      >
                        准备状态：{readyCount}/{PLAYER_COUNT}
                      </Text>
                      <Text
                        style={{
                          color: myReadyState ? "#10B981" : "#F59E0B",
                          fontSize: 14,
                        }}
                      >
                        {myReadyState ? "✓ 你已准备" : "⏳ 你未准备"}
                      </Text>
                      <Text
                        style={{
                          color: "#94A3B8",
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        真人：{humanCount} · AI：{aiCount}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "column", gap: 8 }}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {!myReadyState ? (
                          <Button
                            title="准备"
                            onPress={onlineVm.readyUp}
                            color="#10B981"
                          />
                        ) : (
                          <Button
                            title="取消准备"
                            onPress={onlineVm.cancelReady}
                            color="#6B7280"
                          />
                        )}
                        <Button
                          title="开始游戏"
                          onPress={onlineVm.startGame}
                          disabled={!allReady}
                          color={allReady ? "#3B82F6" : "#4B5563"}
                        />
                      </View>
                      {canAddAI && (
                        <Button
                          title="➕ 添加AI"
                          onPress={onlineVm.addAI}
                          color="#8B5CF6"
                        />
                      )}
                    </View>
                  </View>

                  {!allReady && (
                    <Text
                      style={{
                        color: "#94A3B8",
                        fontSize: 12,
                        marginTop: 8,
                      }}
                    >
                      {totalPlayers < PLAYER_COUNT
                        ? `等待玩家加入（${totalPlayers}/${PLAYER_COUNT}）`
                        : `等待所有玩家准备（${readyCount}/${PLAYER_COUNT}）`}
                    </Text>
                  )}
                </View>
              );
            })()}

          {/* 如果服务端已经广播了 gameState，就用同一套 GameStatusPanel */}
          {!showRoomSelector && onlineVm.gameState && (
            <GameStatusPanel state={onlineVm.gameState as any} />
          )}

          {/* 联机牌桌：直接喂 viewModel（只在已加入房间后显示） */}
          {!showRoomSelector &&
            onlineRoomId !== "temp-room" &&
            (() => {
              const gameState = onlineVm.gameState;
              if (!gameState) {
                return (
                  <View style={homeStyles.tableSection}>
                    <Text style={homeStyles.tableTitle}>
                      👥 六人牌桌 · 联机
                    </Text>
                    <SixPlayerTableLayout viewModel={onlineVm} />
                  </View>
                );
              }

              // 构建联机模式的 manualPanelProps
              const players = gameState.players;
              const mySeatIndex = onlineVm.mySeatIndex;
              const myPlayer = mySeatIndex >= 0 ? players[mySeatIndex] : null;

              let onlineManualProps: ManualPlayerPanelProps | null = null;
              let onlineLastPlayOwnerName: string | undefined = undefined;

              if (myPlayer) {
                // 总是显示自己的手牌，但只有轮到自己时才能操作
                onlineLastPlayOwnerName =
                  gameState.lastPlayOwnerIndex != null
                    ? players[gameState.lastPlayOwnerIndex]?.name
                    : undefined;

                const mustBeatCurrent = gameState.lastPlay != null;
                const isMyTurn = gameState.currentPlayerIndex === mySeatIndex;

                // 构建 request 用于 AI 推荐
                const currentRequest = isMyTurn
                  ? {
                      type: mustBeatCurrent
                        ? ("REACT" as const)
                        : ("TURN" as const),
                      playerIndex: mySeatIndex,
                    }
                  : null;

                // 使用 AI 推荐判断是否有可管牌
                let recommendedCards: Card[] | null = null;
                let hasBeatablePlay = false;

                if (currentRequest) {
                  const recommendation = getRecommendationForManual(
                    gameState as unknown as EngineGameState,
                    currentRequest
                  );
                  recommendedCards = recommendation.recommendedCards;
                  hasBeatablePlay = recommendation.hasBeatablePlay;
                }

                onlineManualProps = {
                  player: myPlayer,
                  // 只有轮到自己时才传 request，这样按钮才会启用
                  request: currentRequest,
                  lastPlay: gameState.lastPlay,
                  mustBeatCurrent,
                  hasBeatablePlay,
                  triggerPlayerName: onlineLastPlayOwnerName,
                  onSubmit: (cards) => {
                    if (!cards || cards.length === 0) return;
                    onlineVm.playCards(cards);
                  },
                  onPass: () => {
                    onlineVm.pass();
                  },
                  onHintRequest: async (): Promise<Card[] | null> => {
                    return recommendedCards ?? null;
                  },
                };
              }

              return (
                <View style={homeStyles.tableSection}>
                  <Text style={homeStyles.tableTitle}>👥 六人牌桌 · 联机</Text>
                  <SixPlayerTableLayout
                    viewModel={onlineVm}
                    manualPanelProps={onlineManualProps}
                    lastPlay={gameState.lastPlay}
                    lastPlayOwnerName={onlineLastPlayOwnerName}
                  />
                </View>
              );
            })()}
        </>
      )}

      {/* 底部间距 */}
      <View style={homeStyles.bottomSpacer} />
    </ScrollView>
  );
}
