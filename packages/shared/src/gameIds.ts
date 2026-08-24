import { CARD_BANK_GAME_ID } from "./game/card-bank/types.js";

export const SUPPORTED_GAME_IDS = [CARD_BANK_GAME_ID] as const;

export type GameId = (typeof SUPPORTED_GAME_IDS)[number];
