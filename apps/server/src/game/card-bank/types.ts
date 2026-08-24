import type {
  CARD_BANK_GAME_ID,
  CardBankCardCounts,
  CardBankCardValue,
  CardBankSettings,
  PublicCardBankStanding
} from "@multiplayer-blueprint/shared";
import type { RoomBase } from "../../rooms/roomBase.js";

export type CardBankPlayerState = {
  playerId: string;
  activeCards: CardBankCardCounts;
  bankedCards: CardBankCardCounts;
  extraLives: number;
};

export type CardBankPendingSteal = {
  drawnValue: CardBankCardValue;
  candidates: {
    playerId: string;
    count: number;
  }[];
};

export type CardBankPendingBust = {
  playerId: string;
  cardValue: CardBankCardValue;
};

export type CardBankGameState = {
  status: "playing" | "finished";
  extraLivesEnabled: boolean;
  turnPhase:
    | "awaiting-draw"
    | "awaiting-steal"
    | "awaiting-decision"
    | "revealing-bust"
    | "ending"
    | "finished";
  deck: CardBankCardValue[];
  discard: CardBankCardValue[];
  turnOrder: string[];
  currentPlayerIndex: number;
  players: Record<string, CardBankPlayerState>;
  pendingSteal: CardBankPendingSteal | null;
  pendingBust: CardBankPendingBust | null;
  finalStandings: PublicCardBankStanding[] | null;
  winnerPlayerIds: string[];
};

export type CardBankRoom = RoomBase<
  typeof CARD_BANK_GAME_ID,
  CardBankSettings,
  CardBankGameState
>;
