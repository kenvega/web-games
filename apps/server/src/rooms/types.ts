import type {
  GameId,
  PublicChatMessage,
  PublicPlayer,
  RoomPhase
} from "@multiplayer-blueprint/shared";
import type { CardBankGameState } from "../game/card-bank/cardBankGame.js";

export type Player = PublicPlayer & {
  socketId: string | null;
};

export type Room = {
  code: string;
  gameId: GameId;
  hostPlayerId: string;
  phase: RoomPhase;
  players: Record<string, Player>;
  chatMessages: PublicChatMessage[];
  gameState: CardBankGameState | null;
  extraLivesEnabled: boolean;
  version: number;
  createdAt: number;
  updatedAt: number;
};
