import type {
  PublicSymbolMatchChallenge,
  PublicSymbolMatchCorrectFeedback,
  PublicSymbolMatchResult,
  PublicSymbolMatchWrongFeedback,
  SYMBOL_MATCH_GAME_ID,
  SymbolMatchSettings,
  SymbolMatchSymbolId,
  SymbolMatchTargetScore
} from "@multiplayer-blueprint/shared";
import type { RoomBase } from "../../rooms/roomBase.js";

export type SymbolMatchPlayerOrder = [string, string];

export type SymbolMatchPrivateChallenge = PublicSymbolMatchChallenge & {
  sharedSymbolId: SymbolMatchSymbolId;
};

export type SymbolMatchGameStateBase = {
  matchId: string;
  deckVersion: string;
  printedLayoutsVersion: string;
  targetScore: SymbolMatchTargetScore;
  playerOrder: SymbolMatchPlayerOrder;
  scores: Record<string, number>;
  drawOrder: number[];
  nextCardIndex: number;
  setAsideCardId: number;
  nextChallengeNumber: number;
  nextAttemptNumber: number;
};

export type SymbolMatchCountdownState = SymbolMatchGameStateBase & {
  status: "countdown";
  countdownEndsAt: number;
};

export type SymbolMatchChallengeOpenState = SymbolMatchGameStateBase & {
  status: "challenge-open";
  challenge: SymbolMatchPrivateChallenge;
  wrongFeedback: PublicSymbolMatchWrongFeedback[];
  recentWrongSelections: Record<string, number>;
};

export type SymbolMatchChallengeFeedbackState = SymbolMatchGameStateBase & {
  status: "challenge-feedback";
  challenge: SymbolMatchPrivateChallenge;
  wrongFeedback: PublicSymbolMatchWrongFeedback[];
  correctFeedback: PublicSymbolMatchCorrectFeedback;
  result: PublicSymbolMatchResult | null;
};

export type SymbolMatchPausedState = SymbolMatchGameStateBase & {
  status: "paused";
  disconnectedPlayerIds: string[];
  graceEndsAt: number;
};

export type SymbolMatchEndingFeedbackState = SymbolMatchGameStateBase & {
  status: "ending-feedback";
  challenge: SymbolMatchPrivateChallenge;
  wrongFeedback: PublicSymbolMatchWrongFeedback[];
  feedbackEndsAt: number;
  result: PublicSymbolMatchResult;
};

export type SymbolMatchFinishedState = SymbolMatchGameStateBase & {
  status: "finished";
  result: PublicSymbolMatchResult;
};

export type SymbolMatchGameState =
  | SymbolMatchCountdownState
  | SymbolMatchChallengeOpenState
  | SymbolMatchChallengeFeedbackState
  | SymbolMatchPausedState
  | SymbolMatchEndingFeedbackState
  | SymbolMatchFinishedState;

export type SymbolMatchRoom = RoomBase<
  typeof SYMBOL_MATCH_GAME_ID,
  SymbolMatchSettings,
  SymbolMatchGameState
>;
