import { useCallback, useEffect, useMemo, useState } from "react";

import { GameState } from "@/features/game/engine/gameEngineDemo";
import { ManualDecisionRequest } from "@/features/game/engine/manualController";
import {
  GatewayCommand,
  GatewayRoomEvent,
} from "../network/InMemoryRoomGateway";
import {
  RoomGatewayClient,
  RoomGatewayConnectionState,
} from "../network/RoomGatewayClient";
import { RoomSummary } from "../types";

export interface UseRoomGatewayOptions {
  autoConnect?: boolean;
  url?: string;
  createSocket?: () => WebSocket;
}

export interface ManualRequestState {
  roomId: string;
  sessionId: string;
  request: ManualDecisionRequest;
}

export interface RoomGatewayHookState {
  client: RoomGatewayClient;
  connectionState: RoomGatewayConnectionState;
  clientId?: string;
  rooms: RoomSummary[];
  roomStates: Record<string, GameState>;
  manualRequests: Record<string, ManualRequestState>;
  lastEvent: GatewayRoomEvent | null;
  connect: () => Promise<string>;
  disconnect: () => void;
  sendCommand: <T = unknown>(command: GatewayCommand) => Promise<T>;
}

export function useRoomGateway(
  options: UseRoomGatewayOptions = {}
): RoomGatewayHookState {
  const { autoConnect = true, url, createSocket } = options;

  const client = useMemo(
    () =>
      new RoomGatewayClient({
        url,
        createSocket,
      }),
    [createSocket, url]
  );

  const [connectionState, setConnectionState] =
    useState<RoomGatewayConnectionState>(client.state);
  const [clientId, setClientId] = useState<string | undefined>(client.id);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomStates, setRoomStates] = useState<Record<string, GameState>>({});
  const [manualRequests, setManualRequests] = useState<
    Record<string, ManualRequestState>
  >({});
  const [lastEvent, setLastEvent] = useState<GatewayRoomEvent | null>(null);

  useEffect(() => {
    const removeStatusListener = client.onConnectionChange((nextState) => {
      setConnectionState(nextState);
      setClientId(client.id);
    });
    // Sync initial state with the memoized client instance
    setConnectionState(client.state);
    setClientId(client.id);
    return () => {
      removeStatusListener();
      client.disconnect();
    };
  }, [client]);

  useEffect(() => {
    const removeEventListener = client.onEvent((event) => {
      setLastEvent(event);
      switch (event.type) {
        case "ROOMS_UPDATED":
          setRooms(event.rooms);
          break;
        case "STATE_UPDATED":
          setRoomStates((prev) => ({
            ...prev,
            [event.roomId]: event.state,
          }));
          setManualRequests((prev) => {
            const pending = prev[event.roomId];
            if (!pending) {
              return prev;
            }
            const isStillWaiting =
              !event.state.gameOver &&
              event.state.currentPlayerIndex === pending.request.playerIndex;
            if (isStillWaiting) {
              return prev;
            }
            const next = { ...prev };
            delete next[event.roomId];
            return next;
          });
          break;
        case "MANUAL_REQUIRED":
          setManualRequests((prev) => ({
            ...prev,
            [event.roomId]: {
              roomId: event.roomId,
              sessionId: event.sessionId,
              request: event.request,
            },
          }));
          break;
        default:
          break;
      }
    });
    return () => {
      removeEventListener();
    };
  }, [client]);

  useEffect(() => {
    if (!autoConnect) return;
    let cancelled = false;
    client
      .connect()
      .then((id) => {
        if (!cancelled) {
          setClientId(id);
        }
      })
      .catch((error) => {
        console.warn("Room gateway connection failed", error);
      });
    return () => {
      cancelled = true;
    };
  }, [autoConnect, client]);

  const connect = useCallback(() => client.connect(), [client]);
  const disconnect = useCallback(() => client.disconnect(), [client]);
  const sendCommand = useCallback(
    <T,>(command: GatewayCommand) => client.sendCommand(command) as Promise<T>,
    [client]
  );

  return {
    client,
    connectionState,
    clientId,
    rooms,
    roomStates,
    manualRequests,
    lastEvent,
    connect,
    disconnect,
    sendCommand,
  };
}
