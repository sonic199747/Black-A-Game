import {
  RoomCommand,
  RoomServerEvent,
} from "@/shared/network/roomMessages";

type GatewayServerMessage =
  | { kind: "READY"; clientId: string }
  | { kind: "GATEWAY_EVENT"; event: RoomServerEvent }
  | { kind: "ROOM_EVENT"; event: RoomServerEvent }
  | {
      kind: "COMMAND_RESULT";
      requestId?: string;
      command: string;
      result: unknown;
    }
  | {
      kind: "COMMAND_ERROR";
      requestId?: string;
      command?: string;
      error: string;
      message?: string;
    };

type GatewayCommandRequest =
  | RoomCommand
  | {
      requestId: string;
      command: RoomCommand;
    };

type EventListener<T> = (value: T) => void;

const DEFAULT_GATEWAY_URL =
  process.env.EXPO_PUBLIC_GATEWAY_URL?.trim() || "ws://localhost:9090";

const READY_STATE_OPEN = 1;

export type RoomGatewayConnectionState =
  | "disconnected"
  | "connecting"
  | "connected";

export interface RoomGatewayClientOptions {
  url?: string;
  createSocket?: () => WebSocket;
}

interface RequestResolvers {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

export class RoomGatewayClient {
  private readonly url: string;
  private readonly createSocket?: () => WebSocket;
  private socket?: WebSocket;
  private connectionState: RoomGatewayConnectionState = "disconnected";
  private clientId?: string;
  private connectPromise?: Promise<string>;
  private requestCounter = 0;

  private readonly eventListeners = new Set<EventListener<RoomServerEvent>>();
  private readonly statusListeners = new Set<
    EventListener<RoomGatewayConnectionState>
  >();
  private readonly pendingRequests = new Map<string, RequestResolvers>();

  constructor(options?: RoomGatewayClientOptions) {
    this.url = options?.url ?? DEFAULT_GATEWAY_URL;
    this.createSocket = options?.createSocket;
  }

  get state(): RoomGatewayConnectionState {
    return this.connectionState;
  }

  get id(): string | undefined {
    return this.clientId;
  }

  async connect(): Promise<string> {
    if (this.connectionState === "connected" && this.clientId) {
      return this.clientId;
    }
    if (this.connectionState === "connecting" && this.connectPromise) {
      return this.connectPromise;
    }

    const WebSocketFactory =
      this.createSocket ?? (() => new WebSocket(this.url));
    this.connectionState = "connecting";
    this.notifyStatus();

    this.connectPromise = new Promise<string>((resolve, reject) => {
      try {
        this.socket = WebSocketFactory();
      } catch (error) {
        this.connectionState = "disconnected";
        this.connectPromise = undefined;
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to create WebSocket connection")
        );
        return;
      }

      const socket = this.socket;

      socket.addEventListener?.("open", () => {
        this.connectionState = "connecting";
        this.notifyStatus();
      });

      socket.addEventListener?.("message", (event) => {
        this.handleMessage(event?.data, resolve);
      });

      socket.addEventListener?.("close", () => {
        this.handleDisconnect(new Error("Connection closed"));
      });

      socket.addEventListener?.("error", () => {
        this.handleDisconnect(new Error("Gateway connection error"));
      });

      // Fallback for environments where addEventListener is not defined
      if (!socket.addEventListener) {
        socket.onmessage = (event: MessageEvent) => {
          this.handleMessage(event?.data, resolve);
        };
        socket.onclose = () => {
          this.handleDisconnect(new Error("Connection closed"));
        };
        socket.onerror = () => {
          this.handleDisconnect(new Error("Gateway connection error"));
        };
      }
    });

    return this.connectPromise;
  }

  disconnect() {
    this.socket?.close();
    this.handleDisconnect(new Error("Disconnected by client"));
  }

  onEvent(listener: EventListener<RoomServerEvent>): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  onConnectionChange(
    listener: EventListener<RoomGatewayConnectionState>
  ): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  async sendCommand(command: RoomCommand): Promise<unknown> {
    if (
      !this.socket ||
      this.socket.readyState !== READY_STATE_OPEN ||
      this.connectionState !== "connected"
    ) {
      throw new Error("Room gateway is not connected");
    }
    const requestId = `req-${++this.requestCounter}`;
    const payload: GatewayCommandRequest = {
      requestId,
      command,
    };
    const message = JSON.stringify(payload);
    return new Promise<unknown>((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
      });
      try {
        this.socket?.send(message);
      } catch (error) {
        this.pendingRequests.delete(requestId);
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to send gateway command")
        );
      }
    });
  }

  private handleMessage(
    rawData: unknown,
    resolveConnect: (value: string) => void
  ) {
    if (!rawData) return;
    let message: GatewayServerMessage | null = null;
    try {
      const json =
        typeof rawData === "string" ? rawData : rawData.toString?.() ?? "";
      message = JSON.parse(json);
    } catch (error) {
      console.warn("Failed to parse gateway message", error);
      return;
    }

    if (!message) return;

    if (message.kind === "READY") {
      this.clientId = message.clientId;
      this.connectionState = "connected";
      this.notifyStatus();
      resolveConnect(message.clientId);
      this.connectPromise = undefined;
      return;
    }

    if (message.kind === "GATEWAY_EVENT" || message.kind === "ROOM_EVENT") {
      this.eventListeners.forEach((listener) => listener(message!.event));
      return;
    }

    if (
      (message.kind === "COMMAND_RESULT" || message.kind === "COMMAND_ERROR") &&
      message.requestId
    ) {
      const pending = this.pendingRequests.get(message.requestId);
      if (!pending) return;
      this.pendingRequests.delete(message.requestId);
      if (message.kind === "COMMAND_RESULT") {
        pending.resolve(message.result);
      } else {
        pending.reject(new Error(message.error ?? "Gateway command failed"));
      }
    }
  }

  private handleDisconnect(error: Error) {
    if (this.connectionState === "disconnected") return;
    this.connectionState = "disconnected";
    this.notifyStatus();
    this.clientId = undefined;
    this.connectPromise = undefined;
    this.socket = undefined;
    this.rejectAllPending(error);
  }

  private rejectAllPending(error: Error) {
    const pending = Array.from(this.pendingRequests.values());
    this.pendingRequests.clear();
    pending.forEach(({ reject }) => reject(error));
  }

  private notifyStatus() {
    this.statusListeners.forEach((listener) => listener(this.connectionState));
  }
}
