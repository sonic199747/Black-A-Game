import { createContext, useContext, type ReactNode } from "react";

import {
  useNetworkRoomGame,
  type NetworkRoomGameState,
} from "../hooks/useNetworkRoomGame";

export type RoomManagerValue = NetworkRoomGameState;

const RoomManagerContext = createContext<RoomManagerValue | null>(null);

export interface RoomManagerProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

export function RoomManagerProvider({
  children,
  autoConnect = true,
}: RoomManagerProviderProps) {
  const networkState = useNetworkRoomGame({
    autoConnect,
  });

  return (
    <RoomManagerContext.Provider value={networkState}>
      {children}
    </RoomManagerContext.Provider>
  );
}

export function useRoomManagerContext(): RoomManagerValue {
  const ctx = useContext(RoomManagerContext);
  if (!ctx) {
    throw new Error("useRoomManagerContext must be used inside RoomManagerProvider.");
  }
  return ctx;
}
