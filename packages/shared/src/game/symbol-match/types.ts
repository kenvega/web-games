import type {
  CreateRoomInputFor,
  GameActionInputFor,
  PublicRoomBase,
  UpdateRoomSettingsInputFor
} from "../../multiplayer.js";

export const SYMBOL_MATCH_GAME_ID = "symbol-match" as const;

export const SYMBOL_MATCH_MIN_PLAYERS = 2;
export const SYMBOL_MATCH_MAX_PLAYERS = 2;

export const SYMBOL_MATCH_CARD_COUNT = 57;
export const SYMBOL_MATCH_PLAYABLE_CARD_COUNT = 56;
export const SYMBOL_MATCH_SYMBOL_COUNT = 57;
export const SYMBOL_MATCH_SYMBOLS_PER_CARD = 8;

export const SYMBOL_MATCH_TARGET_SCORE_OPTIONS = [5, 7, 10] as const;
export const DEFAULT_SYMBOL_MATCH_TARGET_SCORE = 5;

export const SYMBOL_MATCH_WRONG_REPEAT_WINDOW_MS = 500;
export const SYMBOL_MATCH_WRONG_FEEDBACK_MS = 500;
export const SYMBOL_MATCH_CORRECT_FEEDBACK_MS = 900;
export const SYMBOL_MATCH_START_COUNTDOWN_MS = 3_000;
export const SYMBOL_MATCH_RECONNECT_GRACE_MS = 60_000;

export const SYMBOL_MATCH_MIN_PRINTED_SYMBOL_SCALE = 0.18;
export const SYMBOL_MATCH_MAX_PRINTED_SYMBOL_SCALE = 0.3;

export const SYMBOL_MATCH_MAX_CHALLENGE_ID_LENGTH = 64;

export const SYMBOL_MATCH_SYMBOL_IDS = [
  "hammer",
  "key",
  "anchor",
  "wrench",
  "magnet",
  "bell",
  "lock",
  "camera",
  "sun",
  "moon",
  "cloud",
  "lightning-bolt",
  "flame",
  "leaf",
  "cactus",
  "snowflake",
  "cat",
  "whale",
  "owl",
  "turtle",
  "butterfly",
  "frog",
  "snail",
  "bee",
  "apple",
  "cherries",
  "watermelon",
  "mushroom",
  "cupcake",
  "pretzel",
  "carrot",
  "lemon",
  "rocket",
  "sailboat",
  "bicycle",
  "airplane",
  "train",
  "balloon",
  "planet",
  "flying-saucer",
  "crown",
  "shield",
  "potion",
  "wand",
  "treasure-chest",
  "ghost",
  "dice",
  "puzzle-piece",
  "star",
  "heart",
  "diamond",
  "spiral",
  "water-drop",
  "four-leaf-clover",
  "eye",
  "music-note",
  "boot"
] as const;

export type SymbolMatchTargetScore =
  (typeof SYMBOL_MATCH_TARGET_SCORE_OPTIONS)[number];

export type SymbolMatchSymbolId = (typeof SYMBOL_MATCH_SYMBOL_IDS)[number];

export type SymbolMatchSettings = {
  targetScore: SymbolMatchTargetScore;
};

export type SymbolMatchGameAction = {
  type: "select-symbol";
  challengeId: string;
  symbolId: SymbolMatchSymbolId;
};

export type SymbolMatchCommandErrorCode =
  | "INVALID_GAME_ACTION"
  | "INVALID_CHALLENGE_PHASE"
  | "STALE_CHALLENGE"
  | "SYMBOL_NOT_ON_CARD"
  | "DUPLICATE_SELECTION";

export type PublicSymbolMatchPlayerScore = {
  playerId: string;
  points: number;
};

export type PublicSymbolMatchPrintedSymbol = {
  symbolId: SymbolMatchSymbolId;
  x: number;
  y: number;
  scale: number;
  rotationDegrees: number;
};

export type PublicSymbolMatchCard = {
  cardId: number;
  assignedPlayerId: string;
  wholeRotationDegrees: number;
  printedSymbols: PublicSymbolMatchPrintedSymbol[];
};

export type PublicSymbolMatchChallenge = {
  challengeId: string;
  cards: [PublicSymbolMatchCard, PublicSymbolMatchCard];
};

export type PublicSymbolMatchWrongFeedback = {
  attemptId: string;
  challengeId: string;
  answeringPlayerId: string;
  pointRecipientPlayerId: string;
  selectedCardId: number;
  symbolId: SymbolMatchSymbolId;
  expiresAt: number;
};

export type PublicSymbolMatchCorrectFeedback = {
  challengeId: string;
  answeringPlayerId: string;
  pointRecipientPlayerId: string;
  selectedCardId: number;
  symbolId: SymbolMatchSymbolId;
  expiresAt: number;
};

export type PublicSymbolMatchResult =
  | {
      kind: "winner";
      winnerPlayerId: string;
      reason: "target-score" | "deck-score" | "forfeit";
    }
  | {
      kind: "tie";
      winnerPlayerId: null;
      reason: "deck-exhausted";
    }
  | {
      kind: "abandoned";
      winnerPlayerId: null;
      reason: "all-disconnected";
    };

type PublicSymbolMatchStateBase = {
  targetScore: SymbolMatchTargetScore;
  scores: PublicSymbolMatchPlayerScore[];
};

export type PublicSymbolMatchCountdownState = PublicSymbolMatchStateBase & {
  status: "countdown";
  countdownEndsAt: number;
};

export type PublicSymbolMatchChallengeOpenState = PublicSymbolMatchStateBase & {
  status: "challenge-open";
  challenge: PublicSymbolMatchChallenge;
  wrongFeedback: PublicSymbolMatchWrongFeedback[];
};

export type PublicSymbolMatchChallengeFeedbackState =
  PublicSymbolMatchStateBase & {
    status: "challenge-feedback";
    challenge: PublicSymbolMatchChallenge;
    wrongFeedback: PublicSymbolMatchWrongFeedback[];
    correctFeedback: PublicSymbolMatchCorrectFeedback;
    result: PublicSymbolMatchResult | null;
  };

export type PublicSymbolMatchPausedState = PublicSymbolMatchStateBase & {
  status: "paused";
  disconnectedPlayerIds: string[];
  graceEndsAt: number;
};

export type PublicSymbolMatchEndingFeedbackState =
  PublicSymbolMatchStateBase & {
    status: "ending-feedback";
    challenge: PublicSymbolMatchChallenge;
    wrongFeedback: PublicSymbolMatchWrongFeedback[];
    feedbackEndsAt: number;
    result: PublicSymbolMatchResult;
  };

export type PublicSymbolMatchFinishedState = PublicSymbolMatchStateBase & {
  status: "finished";
  result: PublicSymbolMatchResult;
};

export type PublicSymbolMatchGameState =
  | PublicSymbolMatchCountdownState
  | PublicSymbolMatchChallengeOpenState
  | PublicSymbolMatchChallengeFeedbackState
  | PublicSymbolMatchPausedState
  | PublicSymbolMatchEndingFeedbackState
  | PublicSymbolMatchFinishedState;

export type PublicSymbolMatchRoomState = PublicRoomBase<
  typeof SYMBOL_MATCH_GAME_ID
> & {
  game: {
    settings: SymbolMatchSettings;
    state: PublicSymbolMatchGameState | null;
  };
};

export type SymbolMatchCreateRoomInput = CreateRoomInputFor<
  typeof SYMBOL_MATCH_GAME_ID,
  SymbolMatchSettings
>;

export type SymbolMatchUpdateRoomSettingsInput = UpdateRoomSettingsInputFor<
  typeof SYMBOL_MATCH_GAME_ID,
  SymbolMatchSettings
>;

export type SymbolMatchGameActionInput =
  GameActionInputFor<SymbolMatchGameAction>;
