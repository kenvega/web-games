import type {
  CARD_BANK_GAME_ID,
  CardBankSettings,
  GameId,
  PublicChatMessage,
  PublicPlayer,
  RoomPhase
} from "@multiplayer-blueprint/shared";
import type { CardBankGameState } from "../game/card-bank/cardBankGame.js";

export type Player = PublicPlayer & {
  socketId: string | null;
};

export type RoomBase<TGameId extends GameId, TSettings, TState> = {
  code: string;
  gameId: TGameId;
  hostPlayerId: string;
  phase: RoomPhase;
  players: Record<string, Player>;
  chatMessages: PublicChatMessage[];
  game: {
    settings: TSettings;
    state: TState | null;
  };
  version: number;
  createdAt: number;
  updatedAt: number;
};

export type Room = RoomBase<
  typeof CARD_BANK_GAME_ID,
  CardBankSettings,
  CardBankGameState
>;
