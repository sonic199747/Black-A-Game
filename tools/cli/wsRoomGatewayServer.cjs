require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "Node16", moduleResolution: "node16" },
});

const { randomUUID } = require("crypto");
const { WebSocketServer } = require("ws");
const {
  InMemoryRoomGateway,
} = require("../../src/features/multiplayer/network/InMemoryRoomGateway");

const gateway = new InMemoryRoomGateway();
const port = Number(process.env.PORT || 7070);

const wss = new WebSocketServer({ port });
console.log(`[gateway] WebSocket server listening on ws://localhost:${port}`);

function sendJson(socket, payload) {
  if (socket.readyState !== socket.OPEN) {
    return;
  }
  socket.send(JSON.stringify(payload));
}

wss.on("connection", (socket) => {
  const clientId = randomUUID();
  console.log(`[gateway] client connected: ${clientId}`);

  const client = gateway.connect(clientId, (event) => {
    sendJson(socket, { kind: "GATEWAY_EVENT", event });
  });

  sendJson(socket, { kind: "READY", clientId });

  socket.on("message", (data) => {
    let commandPayload = null;
    try {
      commandPayload = JSON.parse(data.toString());
    } catch (error) {
      sendJson(socket, {
        kind: "COMMAND_ERROR",
        error: "INVALID_JSON",
        message: error.message,
      });
      return;
    }

    const command = commandPayload?.command ?? commandPayload;
    const requestId = commandPayload?.requestId;
    if (!command || typeof command?.type !== "string") {
      sendJson(socket, {
        kind: "COMMAND_ERROR",
        requestId,
        error: "INVALID_COMMAND",
      });
      return;
    }

    try {
      const result = client.sendCommand(command);
      sendJson(socket, {
        kind: "COMMAND_RESULT",
        requestId,
        command: command.type,
        result,
      });
    } catch (error) {
      console.error(
        `[gateway] command failed (${command.type}):`,
        error?.message ?? error
      );
      sendJson(socket, {
        kind: "COMMAND_ERROR",
        requestId,
        command: command.type,
        error: error?.message ?? "Unknown error",
      });
    }
  });

  socket.on("close", () => {
    console.log(`[gateway] client disconnected: ${clientId}`);
    client.disconnect();
  });

  socket.on("error", (error) => {
    console.error(`[gateway] socket error for ${clientId}:`, error);
  });
});
