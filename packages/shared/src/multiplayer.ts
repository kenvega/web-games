export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 10;
export const MAX_CHAT_MESSAGES = 100;
export const CHAT_MESSAGE_MAX_LENGTH = 200;
export const DISPLAY_NAME_MAX_LENGTH = 24;

export type RoomCode = string;

export type RoomPhase = "waiting" | "playing" | "finished";

export type PublicPlayer = {
  id: string;
  displayName: string;
  connected: boolean;
  joinedAt: number;
};

export type PublicChatMessage = {
  id: string;
  playerId: string;
  displayName: string;
  text: string;
  createdAt: number;
};

export type PublicRoomBase<TGameId extends string> = {
  code: string;
  gameId: TGameId;
  phase: RoomPhase;
  hostPlayerId: string;
  players: PublicPlayer[];
  chatMessages: PublicChatMessage[];
  version: number;
};

export type CoreCommandErrorCode =
  | "INVALID_INPUT"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "GAME_ALREADY_STARTED"
  | "NOT_ROOM_HOST"
  | "NOT_IN_ROOM"
  | "NOT_ENOUGH_PLAYERS"
  | "PLAYER_ALREADY_CONNECTED"
  | "INVALID_ROOM_PHASE"
  | "MESSAGE_TOO_LONG"
  | "UNEXPECTED_ERROR";

export type CreateRoomInputFor<TGameId extends string, TSettings> = {
  gameId: TGameId;
  guestId: string;
  displayName: string;
  settings: TSettings;
};

export type UpdateRoomSettingsInputFor<TGameId extends string, TSettings> = {
  roomCode: string;
  gameId: TGameId;
  settings: TSettings;
};

export type GameActionInputFor<TAction> = {
  roomCode: string;
  action: TAction;
};

export type JoinRoomInput = {
  roomCode: string;
  guestId: string;
  displayName: string;
};

export type RoomCommandInput = {
  roomCode: string;
};

export type SendChatMessageInput = {
  roomCode: string;
  text: string;
};

export type RoomClosedPayload = {
  roomCode: string;
  message: string;
};

export type GameEventPayload = {
  roomCode: string;
  type: "game-updated" | "match-finished";
};
