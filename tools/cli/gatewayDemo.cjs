require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "Node16", moduleResolution: "node16" },
});

const {
  InMemoryRoomGateway,
} = require("../../src/features/multiplayer/network/InMemoryRoomGateway");

const gateway = new InMemoryRoomGateway();

const client = gateway.connect("cli", (event) => {
  console.log("[EVENT]", event.type, JSON.stringify(event));
});

const roomId = client.sendCommand({
  type: "CREATE_ROOM",
  label: "CLI 房间",
  maxPlayers: 6,
});
console.log("Created room:", roomId);

client.sendCommand({
  type: "JOIN_ROOM",
  roomId,
  displayName: "CLI 玩家",
  kind: "MANUAL",
});

client.sendCommand({ type: "START_GAME", roomId });
client.sendCommand({ type: "PLAY_TURN", roomId, runUntilManual: true });
