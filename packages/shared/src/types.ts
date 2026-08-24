import type {
  CardBankCommandErrorCode,
  CardBankCreateRoomInput,
  CardBankGameActionInput,
  CardBankUpdateRoomSettingsInput,
  PublicCardBankRoomState
} from "./game/card-bank/types.js";
import type { CoreCommandErrorCode, PublicChatMessage } from "./multiplayer.js";

export * from "./game/card-bank/types.js";
export * from "./gameIds.js";
export * from "./multiplayer.js";

// Compatibility aliases until player limits move behind the server game
// module contract.
export {
  CARD_BANK_MAX_PLAYERS as MAX_PLAYERS,
  CARD_BANK_MIN_PLAYERS as MIN_PLAYERS
} from "./game/card-bank/types.js";

// These composition types are unions of every supported game's contract.
// Add one union member here when registering another game.
export type PublicRoomState = PublicCardBankRoomState;
export type CreateRoomInput = CardBankCreateRoomInput;
export type UpdateRoomSettingsInput = CardBankUpdateRoomSettingsInput;
export type GameActionInput = CardBankGameActionInput;
export type CommandErrorCode = CoreCommandErrorCode | CardBankCommandErrorCode;

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

export type SocketErrorPayload = {
  code: CommandErrorCode;
  message: string;
};
