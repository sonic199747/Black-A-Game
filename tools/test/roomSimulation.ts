import { recommendPlay } from "../../src/features/game/engine/gameEngineDemo";
import { RoomManager } from "../../src/features/multiplayer/RoomManager";
import { PlayerSession } from "../../src/features/multiplayer/PlayerSession";

function withMutedLogs<T>(fn: () => T): T {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = originalLog;
  }
}

export async function runRoomSimulation() {
  const manager = new RoomManager();
  let resolveGameOver: (() => void) | null = null;
  const waitForGameOver = new Promise<void>((resolve) => {
    resolveGameOver = resolve;
  });

  const room = manager.createRoom({
    maxPlayers: 6,
    label: "demo-room",
    handlers: {
      onStateChange: (state) => {
        const finished = state.players.filter((p) => p.finished).length;
        console.log(
          `[STATE] current=${state.players[state.currentPlayerIndex]?.name} | finished=${finished}/${state.players.length}`
        );
      },
      onManualRequest: (session, request) => {
        if (!session) {
          throw new Error("Manual request without session.");
        }
        setImmediate(() => {
          const state = room.state;
          if (!state) {
            throw new Error("Room state unavailable during manual decision.");
          }
          const playerIndex = state.players.findIndex(
            (player) => player.id === request.playerId
          );
          if (playerIndex === -1) {
            throw new Error("Manual player not found in state.");
          }
          const recommendation = recommendPlay(
            state,
            playerIndex,
            request.context
          );
          const actionLabel = recommendation
            ? `selecting ${recommendation.length} cards`
            : "auto PASS";
          console.log(
            `[MANUAL] ${session.displayName} responding (${actionLabel})`
          );
          withMutedLogs(() =>
            room.submitManualDecision(session.id, recommendation ?? null)
          );
        });
      },
      onGameOver: (_, currentRoom) => {
        console.log(`[ROOM] game over, status=${currentRoom.currentStatus}`);
        resolveGameOver?.();
      },
    },
  });

  const manualSession = new PlayerSession({
    displayName: "测试玩家",
    kind: "MANUAL",
  });
  const aiSessions = Array.from({ length: 5 }, (_, idx) => {
    return new PlayerSession({
      displayName: `AI-${idx + 1}`,
      kind: "AI",
    });
  });

  [manualSession, ...aiSessions].forEach((session) => room.addPlayer(session));
  withMutedLogs(() => room.startGame());
  withMutedLogs(() => room.playTurns(true));

  await waitForGameOver;

  console.log(
    "[RESULT]",
    {
      winner: room.lastResult?.winner ?? "UNKNOWN",
      caught: room.lastResult?.caught ?? [],
      finishOrder: room.state?.players
        .filter((p) => typeof p.finishOrder === "number")
        .sort((a, b) => (a.finishOrder ?? 0) - (b.finishOrder ?? 0))
        .map((p) => ({ id: p.id, order: p.finishOrder })),
    }
  );
}
