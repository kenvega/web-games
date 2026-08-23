import {
  CARD_BANK_GAME_ID,
  SUPPORTED_GAME_IDS,
  type GameId
} from "@multiplayer-blueprint/shared";

export type GameCatalogItem = {
  id: GameId;
  title: string;
  description: string;
  playerCount: string;
  path: string;
};

const gameCatalog: Record<GameId, GameCatalogItem> = {
  [CARD_BANK_GAME_ID]: {
    id: CARD_BANK_GAME_ID,
    title: "Card Banking",
    description:
      "Draw, steal, and bank cards while deciding how far to push your luck.",
    playerCount: "2–6 players",
    path: `/games/${CARD_BANK_GAME_ID}`
  }
};

export const GAME_CATALOG = SUPPORTED_GAME_IDS.map(
  (gameId) => gameCatalog[gameId]
);
