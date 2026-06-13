export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 10;
export const MAX_CHAT_MESSAGES = 100;
export const CHAT_MESSAGE_MAX_LENGTH = 200;
export const DISPLAY_NAME_MAX_LENGTH = 24;
export const TARGET_SCORE = 3;

export type RoomCode = string;

export type RoomPhase = "waiting" | "playing" | "finished";

export type DemoRoundStatus =
  | "countdown"
  | "active"
  | "round-finished"
  | "match-finished";

export type DemoGameState = {
  roundNumber: number;
  status: DemoRoundStatus;
  startsAt: number | null;
  winnerPlayerId: string | null;
  targetScore: number;
};

export type PublicDemoGameState = DemoGameState;

export type PublicPlayer = {
  id: string;
  displayName: string;
  connected: boolean;
  score: number;
  joinedAt: number;
};

export type PublicChatMessage = {
  id: string;
  playerId: string;
  displayName: string;
  text: string;
  createdAt: number;
};

export type PublicRoomState = {
  code: string;
  phase: RoomPhase;
  hostPlayerId: string;
  players: PublicPlayer[];
  chatMessages: PublicChatMessage[];
  gameState: PublicDemoGameState | null;
  version: number;
};

export type CommandErrorCode =
  | "INVALID_INPUT"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "GAME_ALREADY_STARTED"
  | "NOT_ROOM_HOST"
  | "NOT_IN_ROOM"
  | "NOT_ENOUGH_PLAYERS"
  | "PLAYER_ALREADY_CONNECTED"
  | "INVALID_GAME_ACTION"
  | "ROUND_NOT_ACTIVE"
  | "ACTION_ALREADY_CLAIMED"
  | "MESSAGE_TOO_LONG"
  | "UNEXPECTED_ERROR";

export type CommandError = {
  code: CommandErrorCode;
  message: string;
};

export type CommandResult<T = null> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: CommandError;
    };

export type CreateRoomInput = {
  guestId: string;
  displayName: string;
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

export type DemoGameAction = {
  type: "claim-round";
};

export type GameActionInput = {
  roomCode: string;
  action: DemoGameAction;
};

export type CreateRoomResult = {
  roomCode: string;
  state: PublicRoomState;
};

export type RoomStateResult = {
  state: PublicRoomState;
};

export type SendChatMessageResult = {
  message: PublicChatMessage;
  state: PublicRoomState;
};

export type RoomClosedPayload = {
  roomCode: string;
  message: string;
};

export type GameEventPayload = {
  roomCode: string;
  type: "round-activated" | "round-claimed" | "match-finished";
};

export type SocketErrorPayload = {
  code: CommandErrorCode;
  message: string;
};
