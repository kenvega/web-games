export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 10;
export const MAX_CHAT_MESSAGES = 100;
export const CHAT_MESSAGE_MAX_LENGTH = 200;
export const DISPLAY_NAME_MAX_LENGTH = 24;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const CARD_BANK_CARD_VALUES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10
] as const;

export type CardBankCardValue = (typeof CARD_BANK_CARD_VALUES)[number];

export type CardBankCardCounts = Record<CardBankCardValue, number>;

export const CARD_BANK_CARD_COUNTS: CardBankCardCounts = {
  1: 13,
  2: 13,
  3: 13,
  4: 13,
  5: 13,
  6: 9,
  7: 9,
  8: 9,
  9: 9,
  10: 9
};

export const CARD_BANK_CARD_COLORS: Record<CardBankCardValue, string> = {
  1: "#4FB6E1",
  2: "#6D4996",
  3: "#DA4D3A",
  4: "#B85E9D",
  5: "#ACC53C",
  6: "#E1852E",
  7: "#F5E943",
  8: "#3C57A3",
  9: "#5AB5A9",
  10: "#E1749C"
};

export type RoomCode = string;

export type RoomPhase = "waiting" | "playing" | "finished";

export type CardBankTurnPhase =
  | "awaiting-draw"
  | "awaiting-steal"
  | "awaiting-decision"
  | "revealing-bust"
  | "finished";

export type PublicCardBankPlayerState = {
  playerId: string;
  activeCards: CardBankCardCounts;
  activeCount: number;
  securedScore: number;
};

export type PublicCardBankStealCandidate = {
  playerId: string;
  count: number;
};

export type PublicCardBankPendingSteal = {
  drawnValue: CardBankCardValue;
  candidates: PublicCardBankStealCandidate[];
  totalCount: number;
};

export type PublicCardBankPendingBust = {
  playerId: string;
  cardValue: CardBankCardValue;
};

export type PublicCardBankStanding = {
  playerId: string;
  rank: number;
  score: number;
  bankedCards: CardBankCardCounts;
};

export type PublicCardBankGameState = {
  status: "playing" | "finished";
  currentPlayerId: string | null;
  turnPhase: CardBankTurnPhase;
  deckCount: number;
  discardCount: number;
  players: PublicCardBankPlayerState[];
  pendingSteal: PublicCardBankPendingSteal | null;
  pendingBust: PublicCardBankPendingBust | null;
  finalStandings: PublicCardBankStanding[] | null;
  winnerPlayerIds: string[];
};

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
  gameState: PublicCardBankGameState | null;
  version: number;
};

export type CommandErrorCode =
  | "INVALID_INPUT"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "GAME_ALREADY_STARTED"
  | "NOT_ROOM_HOST"
  | "NOT_IN_ROOM"
  | "NOT_YOUR_TURN"
  | "NOT_ENOUGH_PLAYERS"
  | "PLAYER_ALREADY_CONNECTED"
  | "INVALID_GAME_ACTION"
  | "INVALID_TURN_PHASE"
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

export type CardBankGameAction =
  | {
      type: "draw-card";
    }
  | {
      type: "resolve-steal";
      steal: boolean;
    }
  | {
      type: "stop-turn";
    };

export type GameActionInput = {
  roomCode: string;
  action: CardBankGameAction;
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
  type: "game-updated" | "match-finished";
};

export type SocketErrorPayload = {
  code: CommandErrorCode;
  message: string;
};
