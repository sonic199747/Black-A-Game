// src/features/multiplayer/hooks/useNetworkRoomGame.ts
// 重写版本：直接使用 WebSocket 服务器，不再依赖本地 RoomManager

import type { Card } from "@/features/game/engine/cards";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  RoomGameViewModel,
  RoomState,
} from "@/features/multiplayer/types";
import { useRoomGateway } from "./useRoomGateway";

/**
 * 联机游戏 Hook - 直接与 WebSocket 服务器通信
 */
export function useNetworkRoomGame(
  roomId: string,
  displayName: string
): RoomGameViewModel {
  const { client, clientId, connectionState, sendCommand } = useRoomGateway();

  const [roomState, setRoomState] = useState<RoomState>({
    roomId,
    ownerId: null,
    players: [],
    phase: "lobby",
    gameSnapshot: null,
  });

  const joinedRef = useRef(false);
  const currentRoomIdRef = useRef(roomId);

  // 当房间 ID 变化时重置状态
  useEffect(() => {
    if (currentRoomIdRef.current !== roomId) {
      joinedRef.current = false;
      currentRoomIdRef.current = roomId;
      setRoomState({
        roomId,
        ownerId: null,
        players: [],
        phase: "lobby",
        gameSnapshot: null,
      });
    }
  }, [roomId]);

  // 监听服务器事件
  useEffect(() => {
    const unsubscribe = client.onServerEvent((event) => {
      // 只处理当前房间的事件
      if ("roomId" in event && event.roomId !== roomId) return;

      switch (event.kind) {
        case "ROOM_JOINED":
          console.log("[useNetworkRoomGame] 成功加入房间", event.state);
          setRoomState(event.state);
          break;

        case "ROOM_STATE_UPDATED":
          console.log("[useNetworkRoomGame] 房间状态更新", {
            phase: event.state.phase,
            hasGameSnapshot: !!event.state.gameSnapshot,
            currentPlayer: event.state.gameSnapshot?.currentPlayerIndex,
          });
          setRoomState(event.state);
          break;

        case "GAME_STATE_UPDATED":
          console.log("[useNetworkRoomGame] 游戏状态更新", {
            currentPlayer: event.gameState.currentPlayerIndex,
            currentPlayerName:
              event.gameState.players[event.gameState.currentPlayerIndex]?.name,
          });
          setRoomState((prev) => ({
            ...prev,
            gameSnapshot: event.gameState,
            phase: "playing",
          }));
          break;

        case "ERROR":
          console.error("[useNetworkRoomGame] 服务器错误:", event.message);
          break;
      }
    });

    return unsubscribe;
  }, [client, roomId]);

  // 自动加入房间（等待连接成功）
  useEffect(() => {
    if (!clientId) return;
    if (connectionState !== "connected") return;
    if (joinedRef.current) return;
    if (roomId === "temp-room") return; // 占位房间不加入

    console.log(`[useNetworkRoomGame] 加入房间: ${roomId}, 昵称: ${displayName}`);
    joinedRef.current = true;

    sendCommand({
      type: "JOIN_ROOM",
      roomId,
      displayName,
    }).catch((error) => {
      console.error("[useNetworkRoomGame] 加入房间失败:", error);
      joinedRef.current = false;
    });
  }, [clientId, connectionState, roomId, displayName, sendCommand]);

  // 计算我的座位索引
  const mySeatIndex = clientId
    ? roomState.players.findIndex((p) => p.clientId === clientId)
    : -1;

  // 行为方法
  const playCards = useCallback(
    (cards: Card[]) => {
      sendCommand({
        type: "PLAY_CARDS",
        roomId,
        cards,
      }).catch((error) => {
        console.error("[useNetworkRoomGame] 出牌失败:", error);
      });
    },
    [sendCommand, roomId]
  );

  const pass = useCallback(() => {
    sendCommand({
      type: "PASS",
      roomId,
    }).catch((error) => {
      console.error("[useNetworkRoomGame] 过牌失败:", error);
    });
  }, [sendCommand, roomId]);

  const readyUp = useCallback(() => {
    sendCommand({
      type: "READY_UP",
      roomId,
    }).catch((error) => {
      console.error("[useNetworkRoomGame] 准备失败:", error);
    });
  }, [sendCommand, roomId]);

  const cancelReady = useCallback(() => {
    sendCommand({
      type: "CANCEL_READY",
      roomId,
    }).catch((error) => {
      console.error("[useNetworkRoomGame] 取消准备失败:", error);
    });
  }, [sendCommand, roomId]);

  const startGame = useCallback(() => {
    sendCommand({
      type: "START_GAME",
      roomId,
    }).catch((error) => {
      console.error("[useNetworkRoomGame] 开始游戏失败:", error);
    });
  }, [sendCommand, roomId]);

  const addAI = useCallback(() => {
    const aiCount = roomState.players.filter((p) => p.isAI).length;
    sendCommand({
      type: "ADD_AI_PLAYER",
      roomId,
      displayName: `AI ${aiCount + 1}`,
    }).catch((error) => {
      console.error("[useNetworkRoomGame] 添加AI失败:", error);
    });
  }, [sendCommand, roomId, roomState.players]);

  return {
    roomState,
    gameState: roomState.gameSnapshot,
    connectionState,
    mySeatIndex,
    playCards,
    pass,
    readyUp,
    cancelReady,
    startGame,
    addAI,
  };
}
