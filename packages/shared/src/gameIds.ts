import { CARD_BANK_GAME_ID } from "./game/card-bank/types.js";
import { SYMBOL_MATCH_GAME_ID } from "./game/symbol-match/types.js";

export const SUPPORTED_GAME_IDS = [
  CARD_BANK_GAME_ID,
  SYMBOL_MATCH_GAME_ID
] as const;

export type GameId = (typeof SUPPORTED_GAME_IDS)[number];
