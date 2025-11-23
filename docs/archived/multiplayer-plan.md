## Multiplayer Refactor Step 1 — Architecture Notes

Goal for the next iterations: wrap the existing `GameEngine` so multiple “rooms” can exist simultaneously (even if everything still runs locally). Networking can plug in later by swapping how players connect to a room.

### Current building blocks
- `GameEngine` already drives a whole game through `playAutoTurn()` and exposes `state`.
- `ManualDecisionController` lets us replace an AI decision with a “manual” decision function tied to a UI/player.
- `useGameState` in the frontend constructs a single engine instance and treats it as the whole world.

### Proposed multiplayer layer
We introduce three abstractions (names can change later):

1. **PlayerSession**  
   - Represents one real user connection (human or AI placeholder).  
   - Keeps metadata: `id`, display name, decision type (manual/ai), controller reference, connection hooks.  
   - Responsible for pushing manual decisions into its controller.

2. **RoomInstance**  
   - Owns one `GameEngine` plus all metadata for that room (room id, seat assignments, rules).  
   - Holds player order and builds the correct controller map when instantiating the engine.  
   - Exposes lifecycle: `addPlayer`, `removePlayer`, `startGame`, `submitDecision`, `tick`.  
   - Emits events (`onStateChange`, `onManualRequest`, `onRoomEvent`) for UI/transport layers.

3. **RoomManager**  
   - Keeps a dictionary of `RoomInstance`s.  
   - Handles creating rooms, joining rooms, cleaning up finished games, routing messages by `roomId`.

### Integration plan
1. **Step 1 (current)** – Document architecture and decide on folder structure (`src/features/multiplayer` with `RoomManager`, `RoomInstance`, `PlayerSession`).  
2. **Step 2** – Create TypeScript interfaces/types for the three abstractions and stub classes that don’t yet touch UI. They should accept callbacks so we can plug them into React hooks later.  
3. **Step 3** – Build an in-memory proof (no networking): wire a `RoomInstance` around the existing `GameEngine`, allow adding dummy AI players, and expose imperative methods for manual play.  
4. **Step 4** – Update UI hooks to talk to `RoomManager` instead of spawning a single engine. For now each local user can create/join a room instantly.  
5. **Step 5** – When ready, swap transport layer (WebSocket/WebRTC) so remote players call the same room APIs.

This staged approach mirrors what `ddz_server_node` does (player session → room orchestration → game engine), but keeps it TypeScript-first and front-end friendly.

### Local room smoke test

A quick CLI harness lives in `tools/test/roomSimulation.ts`. Run it with:

```bash
npm run test:room
```

It boots one manual session + five AI seats, auto-responds to manual prompts using `recommendPlay`, and runs until the room reports `gameOver`. Use it to sanity-check future Room/Session changes without launching the UI.

### Room toolbar status

`RoomManagerProvider` now keeps lightweight summaries for every room (status, finish count, pending manual flag, recent manual actions). The Home screen reads these summaries to render the room badges, so you can switch between rooms without losing their progress. When wiring up new transports or lobby screens, consume `useRoomManagerContext().summaries` instead of poking individual engines. The React Home view now uses `useNetworkGameState` to populate these summaries from the live WebSocket gateway, so the “房间管理”面板 reflects actual remote rooms rather than ad-hoc local engines，且提供“加入当前房间 / 添加 AI 座位”按钮，便于多客户端在 UI 上直接触发 `joinRoom`。

### Gateway scaffold (toward WebSocket)

`InMemoryRoomGateway` (see `src/features/multiplayer/network/InMemoryRoomGateway.ts`) wraps a `RoomManager` behind a message-based interface so a transport layer can drive rooms without touching React directly. Use the CLI demo `node tools/cli/gatewayDemo.cjs` to simulate a client: it creates a room, joins as a manual player, starts the game, and listens for emitted events. This gateway will later be swapped with a WebSocket server; for now it lets us test the API contract locally.

Run `npm run gateway:ws` to boot a simple Node + `ws` bridge at `ws://localhost:7070`. Each socket maps to a `gateway.connect` client, so sending a JSON-encoded `GatewayCommand` triggers the underlying manager while server-pushed events flow back through the socket. Wrap commands with `{ "requestId": "123", "command": { ... } }` if you need to correlate responses; otherwise you can send the command object directly.

### Room gateway client

`RoomGatewayClient` (`src/features/multiplayer/network/RoomGatewayClient.ts`) is the shared WebSocket client wrapper. It hides connection state, correlates command responses via generated `requestId`s, pumps gateway events through lightweight listeners, and surfaces helpers for React hooks (`connect`, `disconnect`, `onEvent`, `onConnectionChange`, `sendCommand`). Use it as the foundation for `useRoomGateway`/`RoomManagerProvider` so both the CLI and React layers speak the exact same protocol while keeping reconnection + pending command bookkeeping in one place.

`useRoomGateway` (`src/features/multiplayer/hooks/useRoomGateway.ts`) builds on that wrapper for React. It memoizes a client instance, tracks connection status/clientId, consumes gateway events to maintain `rooms`, `roomStates`, and the latest `MANUAL_REQUIRED` payloads, and exposes typed helpers (`sendCommand`, `connect`, `disconnect`). Future UI hooks should read from this source of truth instead of wiring WebSocket state manually.

`useNetworkRoomGame` (`src/features/multiplayer/hooks/useNetworkRoomGame.ts`) composes `useRoomGateway` into a higher-level API for the UI: it remembers the currently selected room/session, offers helpers for `createRoom`, `joinRoom`, `startGame`, `playTurns`, and `submitManualDecision`, and keeps derived state such as `activeRoomSummary`, `activeRoomState`, and the outstanding manual request for that room. This becomes the drop-in replacement for `useLocalRoomGame` once the UI flips over to the WebSocket transport.

`useNetworkGameState` (`src/features/game/hooks/useNetworkGameState.ts`) mirrors the existing `useGameState` API but drives everything through `useNetworkRoomGame`. It auto-connects to the gateway, creates/fills a room (manual slot + auto AI seats), maintains manual histories/turn counters keyed by the remote room id, and exposes the same helpers the UI expects (`handleNextTurn`, `handleRestart`, `submitManualDecision`, etc.). This hook is the bridge that lets the current React screens run against the WebSocket transport without rewriting every component at once.
