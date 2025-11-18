import type { RoomStatus } from "./RoomInstance";

export interface RoomSummary {
  id: string;
  label?: string;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  finishCount: number;
  gameOver: boolean;
  waitingForManual: boolean;
  currentPlayerName?: string;
  manualHistory?: Array<{
    id: number;
    action: string;
    note?: string;
    timestamp: number;
  }>;
  lastUpdated: number;
}
