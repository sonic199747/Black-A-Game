// src/features/multiplayer/hooks/useRoomGateway.ts

import { RoomGatewayConnectionState } from "@/features/multiplayer/types";
import {
  GatewayCommandRequest,
  GatewayServerMessage,
  RoomCommand,
  RoomServerEvent,
} from "@/shared/network/roomMessages";
import { useEffect, useMemo, useState } from "react";

type EventListener<T> = (value: T) => void;

const DEFAULT_GATEWAY_URL =
  process.env.EXPO_PUBLIC_GATEWAY_URL?.trim() || "ws://localhost:9090";

const READY_STATE_OPEN = 1;

export interface RoomGatewayClientOptions {
  url?: string;
  // 用于测试时注入假的 WebSocket；正常情况不用传
  createSocket?: (url: string) => WebSocket;
}

/**
 * 真正管理 WebSocket 的类（与 React 无关）
 */
export class RoomGatewayClient {
  private socket: WebSocket | null = null;
  private readonly url: string;
  private readonly createSocket: (url: string) => WebSocket;

  private connectionState: RoomGatewayConnectionState = "disconnected";

  private connectionStateListeners = new Set<
    EventListener<RoomGatewayConnectionState>
  >();
  private readyListeners = new Set<EventListener<string>>();
  private serverEventListeners = new Set<EventListener<RoomServerEvent>>();

  // requestId -> pending promise
  private pendingCommands = new Map<
    string,
    { resolve: (value: any) => void; reject: (err: any) => void }
  >();

  private clientId: string | null = null;

  constructor(options?: RoomGatewayClientOptions) {
    this.url = options?.url ?? DEFAULT_GATEWAY_URL;
    this.createSocket =
      options?.createSocket ?? ((url: string) => new WebSocket(url));
  }

  getConnectionState(): RoomGatewayConnectionState {
    return this.connectionState;
  }

  getClientId(): string | null {
    return this.clientId;
  }

  /**
   * 对外暴露：确保已经连接上（如果还没连，会主动发起连接）
   */
  ensureConnected() {
    if (this.socket && this.socket.readyState === READY_STATE_OPEN) {
      return;
    }
    this.openSocket();
  }

  disconnect() {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        console.warn("Error closing WebSocket", e);
      }
      this.socket = null;
    }
    this.updateConnectionState("disconnected");
  }

  /**
   * 简单发送命令，不关心返回值
   */
  send(command: RoomCommand) {
    const payload: GatewayCommandRequest = command;
    this.sendRaw(payload);
  }

  /**
   * 发送命令并等待服务器的 COMMAND_RESULT / COMMAND_ERROR
   */
  sendWithAck<T = unknown>(command: RoomCommand): Promise<T> {
    const requestId = this.makeRequestId();
    const payload: GatewayCommandRequest = { requestId, command };

    return new Promise<T>((resolve, reject) => {
      this.pendingCommands.set(requestId, { resolve, reject });
      this.sendRaw(payload);
    });
  }

  /**
   * 订阅连接状态变化
   */
  onConnectionStateChange(
    listener: EventListener<RoomGatewayConnectionState>
  ): () => void {
    this.connectionStateListeners.add(listener);
    // 立即推一次当前状态，方便初始化
    listener(this.connectionState);
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  /**
   * 订阅 READY（拿到 clientId）
   */
  onReady(listener: EventListener<string>): () => void {
    this.readyListeners.add(listener);
    if (this.clientId != null) {
      listener(this.clientId);
    }
    return () => {
      this.readyListeners.delete(listener);
    };
  }

  /**
   * 订阅 RoomServerEvent
   */
  onServerEvent(listener: EventListener<RoomServerEvent>): () => void {
    this.serverEventListeners.add(listener);
    return () => {
      this.serverEventListeners.delete(listener);
    };
  }

  // ------------------- 内部实现 -------------------

  private openSocket() {
    // 防止重复创建
    if (this.socket && this.socket.readyState === READY_STATE_OPEN) {
      return;
    }

    this.updateConnectionState("connecting");

    const ws = this.createSocket(this.url);
    this.socket = ws;

    ws.onopen = () => {
      this.updateConnectionState("connected");
    };

    ws.onclose = () => {
      this.socket = null;
      this.updateConnectionState("disconnected");

      // 这里可以考虑做重连逻辑；现在先简单留空
    };

    ws.onerror = (err) => {
      console.warn("RoomGateway WebSocket error:", err);
      // 出错先标记为断线
      this.updateConnectionState("disconnected");
    };

    ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private sendRaw(payload: GatewayCommandRequest) {
    this.ensureConnected();
    if (!this.socket || this.socket.readyState !== READY_STATE_OPEN) {
      console.warn(
        "RoomGateway: WebSocket not open, drop command:",
        JSON.stringify(payload)
      );
      return;
    }
    try {
      this.socket.send(JSON.stringify(payload));
    } catch (e) {
      console.warn("RoomGateway: failed to send payload", e);
    }
  }

  private handleMessage(rawData: any) {
    let msg: GatewayServerMessage;
    try {
      msg = JSON.parse(String(rawData)) as GatewayServerMessage;
    } catch (e) {
      console.warn("RoomGateway: invalid JSON from server:", rawData);
      return;
    }

    switch (msg.kind) {
      case "READY": {
        this.clientId = msg.clientId;
        this.readyListeners.forEach((listener) => listener(msg.clientId));
        break;
      }

      case "GATEWAY_EVENT": {
        const event = msg.event;
        this.serverEventListeners.forEach((listener) => listener(event));
        break;
      }

      case "COMMAND_RESULT": {
        if (msg.requestId && this.pendingCommands.has(msg.requestId)) {
          const pending = this.pendingCommands.get(msg.requestId)!;
          this.pendingCommands.delete(msg.requestId);
          pending.resolve(msg.result);
        }
        break;
      }

      case "COMMAND_ERROR": {
        if (msg.requestId && this.pendingCommands.has(msg.requestId)) {
          const pending = this.pendingCommands.get(msg.requestId)!;
          this.pendingCommands.delete(msg.requestId);
          pending.reject(
            new Error(msg.message || msg.error || "Command error")
          );
        } else {
          console.warn(
            "RoomGateway: COMMAND_ERROR with no pending request:",
            msg
          );
        }
        break;
      }

      default: {
        // TypeScript 理论上不会进这里，防御性打印一下

        console.warn("RoomGateway: unknown message", msg as any);
      }
    }
  }

  private updateConnectionState(state: RoomGatewayConnectionState) {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.connectionStateListeners.forEach((listener) => listener(state));
  }

  private makeRequestId(): string {
    return (
      Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8)
    );
  }
}

// ------------------- 单例 + React Hook -------------------

let singletonClient: RoomGatewayClient | null = null;

export function getRoomGatewayClient(
  options?: RoomGatewayClientOptions
): RoomGatewayClient {
  if (!singletonClient) {
    singletonClient = new RoomGatewayClient(options);
  }
  return singletonClient;
}

/**
 * React Hook：让组件方便地访问网关连接状态 & client 实例
 */
export function useRoomGateway(options?: RoomGatewayClientOptions) {
  const [connectionState, setConnectionState] =
    useState<RoomGatewayConnectionState>("disconnected");
  const [clientId, setClientId] = useState<string | null>(null);

  // 只在 url 变化时重新创建（一般你不会改 url）
  const client = useMemo(
    () => getRoomGatewayClient(options),
    // 这里只用 url 做依赖，避免 createSocket 之类对象导致重复创建
    [options?.url]
  );

  useEffect(() => {
    const offState = client.onConnectionStateChange(setConnectionState);
    const offReady = client.onReady(setClientId);

    // 挂载时尝试连接
    client.ensureConnected();

    // 卸载时只取消订阅，不强制断开连接（保持单例长连接）
    return () => {
      offState();
      offReady();
    };
  }, [client]);

  return {
    client,
    clientId,
    connectionState,

    // 这几个方法给上层用就好，不用直接碰 client
    sendCommand: <T = unknown>(command: RoomCommand) =>
      client.sendWithAck<T>(command),
    addServerEventListener: (listener: EventListener<RoomServerEvent>) =>
      client.onServerEvent(listener),
  };
}
