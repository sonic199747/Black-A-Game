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
