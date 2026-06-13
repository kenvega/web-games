import type {
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
  hostPlayerId: string;
  phase: RoomPhase;
  players: Record<string, Player>;
  chatMessages: PublicChatMessage[];
  gameState: CardBankGameState | null;
  version: number;
  createdAt: number;
  updatedAt: number;
};
