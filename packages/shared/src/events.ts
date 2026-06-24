import type {
  CommandResult,
  CreateRoomInput,
  CreateRoomResult,
  GameActionInput,
  GameEventPayload,
  JoinRoomInput,
  PublicChatMessage,
  PublicRoomState,
  RoomClosedPayload,
  RoomCommandInput,
  RoomStateResult,
  SendChatMessageInput,
  SendChatMessageResult,
  SocketErrorPayload,
  UpdateRoomSettingsInput
} from "./types.js";

export type Ack<T = null> = (result: CommandResult<T>) => void;

export interface ClientToServerEvents {
  "room:create": (input: CreateRoomInput, ack: Ack<CreateRoomResult>) => void;
  "room:join": (input: JoinRoomInput, ack: Ack<RoomStateResult>) => void;
  "room:leave": (input: RoomCommandInput, ack: Ack) => void;
  "room:start": (input: RoomCommandInput, ack: Ack<RoomStateResult>) => void;
  "room:restart": (input: RoomCommandInput, ack: Ack<RoomStateResult>) => void;
  "room:update-settings": (
    input: UpdateRoomSettingsInput,
    ack: Ack<RoomStateResult>
  ) => void;
  "room:request-state": (
    input: RoomCommandInput,
    ack: Ack<RoomStateResult>
  ) => void;
  "chat:send-message": (
    input: SendChatMessageInput,
    ack: Ack<SendChatMessageResult>
  ) => void;
  "game:action": (input: GameActionInput, ack: Ack<RoomStateResult>) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: PublicRoomState) => void;
  "room:closed": (payload: RoomClosedPayload) => void;
  "room:error": (payload: SocketErrorPayload) => void;
  "chat:message": (message: PublicChatMessage) => void;
  "game:event": (payload: GameEventPayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export type SocketData = {
  guestId?: string;
  roomCode?: string;
};
