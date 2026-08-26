import {
  CARD_BANK_GAME_ID,
  type CardBankCommandErrorCode,
  type CardBankCreateRoomInput,
  type CardBankGameAction,
  type CardBankGameActionInput,
  type CardBankSettings,
  type CardBankUpdateRoomSettingsInput,
  type PublicCardBankRoomState
} from "./game/card-bank/types.js";
import {
  SYMBOL_MATCH_GAME_ID,
  type PublicSymbolMatchRoomState,
  type SymbolMatchCommandErrorCode,
  type SymbolMatchCreateRoomInput,
  type SymbolMatchGameAction,
  type SymbolMatchGameActionInput,
  type SymbolMatchSettings,
  type SymbolMatchUpdateRoomSettingsInput
} from "./game/symbol-match/types.js";
import type { GameId } from "./gameIds.js";
import type { CoreCommandErrorCode, PublicChatMessage } from "./multiplayer.js";

export * from "./game/card-bank/types.js";
export * from "./game/symbol-match/types.js";
export * from "./gameIds.js";
export * from "./multiplayer.js";

// This is the shared composition map for every supported game. Adding a game
// ID requires a corresponding entry, preserving the relationship between that
// ID and its settings, actions, room state, commands, and domain errors.
export type GameContractMap = {
  [CARD_BANK_GAME_ID]: {
    settings: CardBankSettings;
    action: CardBankGameAction;
    publicRoom: PublicCardBankRoomState;
    createRoomInput: CardBankCreateRoomInput;
    updateRoomSettingsInput: CardBankUpdateRoomSettingsInput;
    gameActionInput: CardBankGameActionInput;
    errorCode: CardBankCommandErrorCode;
  };
  [SYMBOL_MATCH_GAME_ID]: {
    settings: SymbolMatchSettings;
    action: SymbolMatchGameAction;
    publicRoom: PublicSymbolMatchRoomState;
    createRoomInput: SymbolMatchCreateRoomInput;
    updateRoomSettingsInput: SymbolMatchUpdateRoomSettingsInput;
    gameActionInput: SymbolMatchGameActionInput;
    errorCode: SymbolMatchCommandErrorCode;
  };
};

export type GameSettings<TGameId extends GameId> =
  GameContractMap[TGameId]["settings"];
export type GameAction<TGameId extends GameId> =
  GameContractMap[TGameId]["action"];
export type PublicGameRoom<TGameId extends GameId> =
  GameContractMap[TGameId]["publicRoom"];

export type PublicRoomState = PublicGameRoom<GameId>;
export type CreateRoomInput = GameContractMap[GameId]["createRoomInput"];
export type UpdateRoomSettingsInput =
  GameContractMap[GameId]["updateRoomSettingsInput"];
export type GameActionInput = GameContractMap[GameId]["gameActionInput"];
export type CommandErrorCode =
  | CoreCommandErrorCode
  | GameContractMap[keyof GameContractMap]["errorCode"];

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
