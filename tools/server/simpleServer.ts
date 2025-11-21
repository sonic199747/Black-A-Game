// tools/server/simpleServer.ts
// 简单的 WebSocket 服务器

import { randomUUID } from "crypto";
import { WebSocket, WebSocketServer } from "ws";
import { SimpleGameServer } from "../../src/server/SimpleGameServer";

const server = new SimpleGameServer();
const port = Number(process.env.PORT ?? 9090);
const wss = new WebSocketServer({ port });

console.log(`🚀 简单游戏服务器已启动: ws://localhost:${port}`);

function sendJson(socket: WebSocket, payload: object) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

wss.on("connection", (socket) => {
  const clientId = randomUUID();
  console.log(`✅ 客户端连接: ${clientId}`);

  const bridge = server.connect(clientId, (event) => {
    sendJson(socket, { kind: "GATEWAY_EVENT", event });
  });

  // 发送连接成功消息
  sendJson(socket, { kind: "READY", clientId });

  socket.on("message", async (raw) => {
    let input: any = null;
    try {
      input = JSON.parse(raw.toString());
    } catch (error) {
      sendJson(socket, {
        kind: "COMMAND_ERROR",
        error: "无效的 JSON",
      });
      return;
    }

    const command = input?.command ?? input;
    const requestId = input?.requestId;
    const commandType = command?.type ?? command?.kind;

    if (!command || typeof commandType !== "string") {
      sendJson(socket, {
        kind: "COMMAND_ERROR",
        requestId,
        error: "无效的命令",
      });
      return;
    }

    try {
      const result = await bridge.handleCommand(command);
      sendJson(socket, {
        kind: "COMMAND_RESULT",
        requestId,
        command: commandType,
        result,
      });
    } catch (error: any) {
      console.error(`❌ 命令失败 (${commandType}):`, error.message);
      sendJson(socket, {
        kind: "COMMAND_ERROR",
        requestId,
        command: commandType,
        error: error.message,
      });
    }
  });

  socket.on("close", () => {
    console.log(`❌ 客户端断开: ${clientId}`);
    bridge.disconnect();
  });

  socket.on("error", (error) => {
    console.error(`⚠️  Socket 错误:`, error);
  });
});

