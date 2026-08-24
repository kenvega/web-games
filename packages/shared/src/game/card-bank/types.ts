import type {
  CreateRoomInputFor,
  GameActionInputFor,
  PublicRoomBase,
  UpdateRoomSettingsInputFor
} from "../../multiplayer.js";

export const CARD_BANK_GAME_ID = "card-bank" as const;
export const CARD_BANK_MIN_PLAYERS = 2;
export const CARD_BANK_MAX_PLAYERS = 6;

export const CARD_BANK_CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export type CardBankCardValue = (typeof CARD_BANK_CARD_VALUES)[number];

export const CARD_BANK_DRAW_CHOICE_INDEXES = [0, 1, 2, 3] as const;
export const CARD_BANK_DRAW_CHOICE_COUNT = CARD_BANK_DRAW_CHOICE_INDEXES.length;

export type CardBankDrawChoiceIndex =
  (typeof CARD_BANK_DRAW_CHOICE_INDEXES)[number];

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

export type CardBankTurnPhase =
  | "awaiting-draw"
  | "awaiting-steal"
  | "awaiting-decision"
  | "revealing-bust"
  | "ending"
  | "finished";

export type PublicCardBankPlayerState = {
  playerId: string;
  activeCards: CardBankCardCounts;
  activeCount: number;
  securedCardCount: number;
  extraLives: number;
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
  drawChoiceCount: number;
  discardCount: number;
  players: PublicCardBankPlayerState[];
  pendingSteal: PublicCardBankPendingSteal | null;
  pendingBust: PublicCardBankPendingBust | null;
  finalStandings: PublicCardBankStanding[] | null;
  winnerPlayerIds: string[];
};

export type CardBankSettings = {
  extraLivesEnabled: boolean;
};

export type CardBankGameAction =
  | {
      type: "draw-card";
      choiceIndex?: CardBankDrawChoiceIndex | undefined;
    }
  | {
      type: "resolve-steal";
      steal: boolean;
    }
  | {
      type: "stop-turn";
    };

export type CardBankCommandErrorCode =
  | "NOT_YOUR_TURN"
  | "INVALID_GAME_ACTION"
  | "INVALID_TURN_PHASE";

export type PublicCardBankRoomState = PublicRoomBase<
  typeof CARD_BANK_GAME_ID
> & {
  game: {
    settings: CardBankSettings;
    state: PublicCardBankGameState | null;
  };
};

export type CardBankCreateRoomInput = CreateRoomInputFor<
  typeof CARD_BANK_GAME_ID,
  CardBankSettings
>;

export type CardBankUpdateRoomSettingsInput = UpdateRoomSettingsInputFor<
  typeof CARD_BANK_GAME_ID,
  CardBankSettings
>;

export type CardBankGameActionInput = GameActionInputFor<CardBankGameAction>;
