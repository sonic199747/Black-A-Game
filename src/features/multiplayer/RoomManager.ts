import { PlayerSession } from "./PlayerSession";
import { RoomEventHandlers, RoomInstance, RoomOptions } from "./RoomInstance";

export interface CreateRoomParams extends RoomOptions {
  handlers?: RoomEventHandlers;
}

export class RoomManager {
  private readonly rooms = new Map<string, RoomInstance>();

  createRoom(params: CreateRoomParams): RoomInstance {
    const room = new RoomInstance(
      {
        id: params.id,
        maxPlayers: params.maxPlayers,
        label: params.label,
      },
      params.handlers
    );
    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(roomId: string): RoomInstance | undefined {
    return this.rooms.get(roomId);
  }

  listRooms(): RoomInstance[] {
    return Array.from(this.rooms.values());
  }

  removeRoom(roomId: string): RoomInstance | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    this.rooms.delete(roomId);
    return room;
  }

  attachPlayer(roomId: string, session: PlayerSession): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} does not exist.`);
    }
    room.addPlayer(session);
  }
}
