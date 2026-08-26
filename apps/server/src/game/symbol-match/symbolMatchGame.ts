import {
  SYMBOL_MATCH_CORRECT_FEEDBACK_MS,
  SYMBOL_MATCH_MAX_PLAYERS,
  SYMBOL_MATCH_MIN_PLAYERS,
  SYMBOL_MATCH_RECONNECT_GRACE_MS,
  SYMBOL_MATCH_START_COUNTDOWN_MS,
  SYMBOL_MATCH_WRONG_FEEDBACK_MS,
  SYMBOL_MATCH_WRONG_REPEAT_WINDOW_MS,
  symbolMatchGameActionSchema,
  symbolMatchSettingsSchema,
  type PublicSymbolMatchCard,
  type PublicSymbolMatchChallenge,
  type PublicSymbolMatchGameState,
  type PublicSymbolMatchPlayerScore,
  type PublicSymbolMatchResult,
  type PublicSymbolMatchWrongFeedback,
  type SymbolMatchCommandErrorCode,
  type SymbolMatchGameAction,
  type SymbolMatchSettings,
  type SymbolMatchSymbolId
} from "@multiplayer-blueprint/shared";
import type { GameActionResult, GameModule } from "../GameModule.js";
import {
  SYMBOL_MATCH_DECK,
  SYMBOL_MATCH_DECK_VERSION
} from "./artifacts/generatedDeck.js";
import {
  SYMBOL_MATCH_PRINTED_LAYOUTS,
  SYMBOL_MATCH_PRINTED_LAYOUTS_VERSION
} from "./artifacts/generatedPrintedLayouts.js";
import type {
  SymbolMatchChallengeFeedbackState,
  SymbolMatchChallengeOpenState,
  SymbolMatchFinishedState,
  SymbolMatchGameState,
  SymbolMatchGameStateBase,
  SymbolMatchPausedState,
  SymbolMatchPlayerOrder,
  SymbolMatchPrivateChallenge,
  SymbolMatchRoom
} from "./types.js";

export type { SymbolMatchGameState, SymbolMatchRoom } from "./types.js";

export type SymbolMatchGameOptions = {
  rng?: () => number;
  now?: () => number;
  countdownMs?: number;
  wrongRepeatWindowMs?: number;
  wrongFeedbackMs?: number;
  correctFeedbackMs?: number;
  reconnectGraceMs?: number;
};

type SymbolMatchActionErrorCode =
  | SymbolMatchCommandErrorCode
  | "INVALID_ROOM_PHASE";

type SymbolMatchActionResult = GameActionResult<
  SymbolMatchGameState,
  SymbolMatchActionErrorCode
>;

type ScheduledTransition = {
  key: string;
  timer: NodeJS.Timeout;
};

type TransitionDescriptor = {
  key: string;
  deadline: number;
};

type SymbolMatchGameModuleContract = GameModule<
  SymbolMatchRoom,
  SymbolMatchSettings,
  SymbolMatchGameState,
  SymbolMatchGameAction,
  PublicSymbolMatchGameState,
  SymbolMatchActionErrorCode
>;

function normalizedRandom(rng: () => number): number {
  const value = rng();
  if (!Number.isFinite(value)) {
    throw new Error("Symbol Match RNG must return a finite number.");
  }
  return value - Math.floor(value);
}

function shuffleCardIds(rng: () => number): number[] {
  const cardIds: number[] = SYMBOL_MATCH_DECK.map((card) => card.id);
  for (let index = cardIds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(normalizedRandom(rng) * (index + 1));
    [cardIds[index], cardIds[swapIndex]] = [
      cardIds[swapIndex] as number,
      cardIds[index] as number
    ];
  }
  return cardIds;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected Symbol Match state: ${JSON.stringify(value)}`);
}

export class SymbolMatchGameModule implements SymbolMatchGameModuleContract {
  readonly settingsSchema = symbolMatchSettingsSchema;
  readonly actionSchema = symbolMatchGameActionSchema;
  readonly playerLimits = {
    min: SYMBOL_MATCH_MIN_PLAYERS,
    max: SYMBOL_MATCH_MAX_PLAYERS
  } as const;

  private readonly rng: () => number;
  private readonly now: () => number;
  private readonly countdownMs: number;
  private readonly wrongRepeatWindowMs: number;
  private readonly wrongFeedbackMs: number;
  private readonly correctFeedbackMs: number;
  private readonly reconnectGraceMs: number;
  private readonly scheduledTransitions = new Map<
    string,
    ScheduledTransition
  >();
  private readonly matchSequenceByRoom = new Map<string, number>();

  constructor(options: SymbolMatchGameOptions = {}) {
    this.rng = options.rng ?? Math.random;
    this.now = options.now ?? Date.now;
    this.countdownMs = options.countdownMs ?? SYMBOL_MATCH_START_COUNTDOWN_MS;
    this.wrongRepeatWindowMs =
      options.wrongRepeatWindowMs ?? SYMBOL_MATCH_WRONG_REPEAT_WINDOW_MS;
    this.wrongFeedbackMs =
      options.wrongFeedbackMs ?? SYMBOL_MATCH_WRONG_FEEDBACK_MS;
    this.correctFeedbackMs =
      options.correctFeedbackMs ?? SYMBOL_MATCH_CORRECT_FEEDBACK_MS;
    this.reconnectGraceMs =
      options.reconnectGraceMs ?? SYMBOL_MATCH_RECONNECT_GRACE_MS;
  }

  start(room: SymbolMatchRoom, now: number): SymbolMatchGameState {
    const settings = this.settingsSchema.safeParse(room.game.settings);
    if (!settings.success) {
      throw new Error("Cannot start Symbol Match with invalid settings.");
    }

    const seatedPlayers = Object.values(room.players);
    if (
      seatedPlayers.length !== SYMBOL_MATCH_MAX_PLAYERS ||
      seatedPlayers.some((player) => !player.connected)
    ) {
      throw new Error("Symbol Match requires exactly two connected players.");
    }

    const guest = seatedPlayers.find(
      (player) => player.id !== room.hostPlayerId
    );
    if (guest === undefined) {
      throw new Error("Symbol Match requires one host and one guest.");
    }
    const playerOrder: SymbolMatchPlayerOrder = [room.hostPlayerId, guest.id];
    const shuffledCardIds = shuffleCardIds(this.rng);
    const setAsideCardId = shuffledCardIds.pop();
    if (setAsideCardId === undefined) {
      throw new Error("The Symbol Match deck is empty.");
    }

    const matchSequence = (this.matchSequenceByRoom.get(room.code) ?? 0) + 1;
    this.matchSequenceByRoom.set(room.code, matchSequence);
    this.clearScheduledTransition(room.code);

    return {
      status: "countdown",
      matchId: `m${matchSequence}`,
      deckVersion: SYMBOL_MATCH_DECK_VERSION,
      printedLayoutsVersion: SYMBOL_MATCH_PRINTED_LAYOUTS_VERSION,
      targetScore: settings.data.targetScore,
      playerOrder,
      scores: {
        [playerOrder[0]]: 0,
        [playerOrder[1]]: 0
      },
      drawOrder: shuffledCardIds,
      nextCardIndex: 0,
      setAsideCardId,
      nextChallengeNumber: 1,
      nextAttemptNumber: 1,
      countdownEndsAt: now + this.countdownMs
    };
  }

  handleAction(input: {
    room: SymbolMatchRoom;
    playerId: string;
    action: SymbolMatchGameAction;
    now: number;
  }): SymbolMatchActionResult {
    const state = input.room.game.state;
    if (state === null || state.status === "finished") {
      return this.reject("INVALID_ROOM_PHASE", "There is no active match.");
    }
    const player = input.room.players[input.playerId];
    if (player === undefined || !player.connected) {
      return this.reject(
        "INVALID_GAME_ACTION",
        "Reconnect before selecting a symbol."
      );
    }
    if (state.status !== "challenge-open") {
      return this.reject(
        "INVALID_CHALLENGE_PHASE",
        "The current challenge is not accepting selections."
      );
    }
    if (input.action.challengeId !== state.challenge.challengeId) {
      return this.reject(
        "STALE_CHALLENGE",
        "Those cards are no longer active."
      );
    }

    const selectedCard = state.challenge.cards.find(
      (card) => card.assignedPlayerId === input.playerId
    );
    if (
      selectedCard === undefined ||
      !selectedCard.printedSymbols.some(
        ({ symbolId }) => symbolId === input.action.symbolId
      )
    ) {
      return this.reject(
        "SYMBOL_NOT_ON_CARD",
        "Select a symbol on your lower card."
      );
    }

    return input.action.symbolId === state.challenge.sharedSymbolId
      ? {
          accepted: true,
          nextState: this.acceptCorrectSelection(
            state,
            input.playerId,
            selectedCard.cardId,
            input.action.symbolId,
            input.now
          )
        }
      : this.acceptWrongSelection(
          state,
          input.playerId,
          selectedCard.cardId,
          input.action.symbolId,
          input.now
        );
  }

  handlePlayerDisconnected(input: {
    room: SymbolMatchRoom;
    playerId: string;
    now: number;
  }): SymbolMatchGameState | null {
    void input.playerId;
    const state = input.room.game.state;
    if (state === null || state.status === "finished") {
      return null;
    }

    if (
      state.status === "ending-feedback" ||
      (state.status === "challenge-feedback" && state.result !== null)
    ) {
      return state;
    }

    if (
      (state.status === "challenge-open" ||
        state.status === "challenge-feedback") &&
      !this.hasCompletePair(state)
    ) {
      return this.finishByDeckScore(state);
    }

    return this.createPausedState(state, input.room, input.now);
  }

  handlePlayerConnected(input: {
    room: SymbolMatchRoom;
    playerId: string;
    now: number;
  }): SymbolMatchGameState | null {
    void input.playerId;
    const state = input.room.game.state;
    if (state === null || state.status !== "paused") {
      return null;
    }

    const disconnectedPlayerIds = this.getDisconnectedPlayerIds(
      input.room,
      state.playerOrder
    );
    if (disconnectedPlayerIds.length > 0) {
      return {
        ...this.toBaseState(state),
        status: "paused",
        disconnectedPlayerIds,
        graceEndsAt: input.now + this.reconnectGraceMs
      };
    }
    if (!this.hasCompletePair(state)) {
      return this.finishByDeckScore(state);
    }

    return {
      ...this.toBaseState(state),
      status: "countdown",
      countdownEndsAt: input.now + this.countdownMs
    };
  }

  syncScheduledTransition(input: {
    room: SymbolMatchRoom;
    onTransition: (nextState: SymbolMatchGameState) => void;
  }): void {
    const state = input.room.game.state;
    const descriptor =
      state === null ? null : this.getTransitionDescriptor(state);
    const existing = this.scheduledTransitions.get(input.room.code);

    if (descriptor === null) {
      this.clearScheduledTransition(input.room.code);
      return;
    }
    if (existing?.key === descriptor.key) {
      return;
    }

    this.clearScheduledTransition(input.room.code);
    const delayMs = Math.max(0, descriptor.deadline - this.now());
    const timer = setTimeout(() => {
      const scheduled = this.scheduledTransitions.get(input.room.code);
      if (scheduled?.timer !== timer || scheduled.key !== descriptor.key) {
        return;
      }
      this.scheduledTransitions.delete(input.room.code);
      const nextState = this.resolveScheduledTransition(input.room, descriptor);
      if (nextState !== null) {
        input.onTransition(nextState);
      }
    }, delayMs);
    timer.unref?.();
    this.scheduledTransitions.set(input.room.code, {
      key: descriptor.key,
      timer
    });
  }

  toPublicState(state: SymbolMatchGameState): PublicSymbolMatchGameState {
    const base = {
      targetScore: state.targetScore,
      scores: this.toPublicScores(state)
    };

    switch (state.status) {
      case "countdown":
        return {
          ...base,
          status: "countdown",
          countdownEndsAt: state.countdownEndsAt
        };
      case "challenge-open":
        return {
          ...base,
          status: "challenge-open",
          challenge: this.toPublicChallenge(state.challenge),
          wrongFeedback: this.pruneWrongFeedback(
            state.wrongFeedback,
            this.now()
          )
        };
      case "challenge-feedback":
        return {
          ...base,
          status: "challenge-feedback",
          challenge: this.toPublicChallenge(state.challenge),
          wrongFeedback: this.pruneWrongFeedback(
            state.wrongFeedback,
            this.now()
          ),
          correctFeedback: { ...state.correctFeedback },
          result: state.result === null ? null : this.cloneResult(state.result)
        };
      case "paused":
        return {
          ...base,
          status: "paused",
          disconnectedPlayerIds: [...state.disconnectedPlayerIds],
          graceEndsAt: state.graceEndsAt
        };
      case "ending-feedback":
        return {
          ...base,
          status: "ending-feedback",
          challenge: this.toPublicChallenge(state.challenge),
          wrongFeedback: this.pruneWrongFeedback(
            state.wrongFeedback,
            this.now()
          ),
          feedbackEndsAt: state.feedbackEndsAt,
          result: this.cloneResult(state.result)
        };
      case "finished":
        return {
          ...base,
          status: "finished",
          result: this.cloneResult(state.result)
        };
      default:
        return assertNever(state);
    }
  }

  isFinished(state: SymbolMatchGameState): boolean {
    return state.status === "finished";
  }

  dispose(roomCode: string): void {
    this.clearScheduledTransition(roomCode);
    this.matchSequenceByRoom.delete(roomCode);
  }

  private reject(
    errorCode: SymbolMatchActionErrorCode,
    message: string
  ): SymbolMatchActionResult {
    return {
      accepted: false,
      errorCode,
      message
    };
  }

  private acceptWrongSelection(
    state: SymbolMatchChallengeOpenState,
    answeringPlayerId: string,
    selectedCardId: number,
    symbolId: SymbolMatchSymbolId,
    now: number
  ): SymbolMatchActionResult {
    const duplicateKey = `${answeringPlayerId}:${symbolId}`;
    const previousSelectionAt = state.recentWrongSelections[duplicateKey];
    if (
      previousSelectionAt !== undefined &&
      now - previousSelectionAt < this.wrongRepeatWindowMs
    ) {
      return this.reject(
        "DUPLICATE_SELECTION",
        "That repeated tap was counted only once."
      );
    }

    const pointRecipientPlayerId = this.getOpponentPlayerId(
      state.playerOrder,
      answeringPlayerId
    );
    const scores = {
      ...state.scores,
      [pointRecipientPlayerId]: (state.scores[pointRecipientPlayerId] ?? 0) + 1
    };
    const wrongFeedback = [
      ...this.pruneWrongFeedback(state.wrongFeedback, now),
      {
        attemptId: `${state.challenge.challengeId}-a${state.nextAttemptNumber}`,
        challengeId: state.challenge.challengeId,
        answeringPlayerId,
        pointRecipientPlayerId,
        selectedCardId,
        symbolId,
        expiresAt: now + this.wrongFeedbackMs
      }
    ];
    const base = {
      ...this.toBaseState(state),
      scores,
      nextAttemptNumber: state.nextAttemptNumber + 1
    };

    if ((scores[pointRecipientPlayerId] ?? 0) >= state.targetScore) {
      const result: PublicSymbolMatchResult = {
        kind: "winner",
        winnerPlayerId: pointRecipientPlayerId,
        reason: "target-score"
      };
      return {
        accepted: true,
        nextState: {
          ...base,
          status: "ending-feedback",
          challenge: state.challenge,
          wrongFeedback,
          feedbackEndsAt: now + this.wrongFeedbackMs,
          result
        }
      };
    }

    return {
      accepted: true,
      nextState: {
        ...base,
        status: "challenge-open",
        challenge: state.challenge,
        wrongFeedback,
        recentWrongSelections: {
          ...state.recentWrongSelections,
          [duplicateKey]: now
        }
      }
    };
  }

  private acceptCorrectSelection(
    state: SymbolMatchChallengeOpenState,
    answeringPlayerId: string,
    selectedCardId: number,
    symbolId: SymbolMatchSymbolId,
    now: number
  ): SymbolMatchChallengeFeedbackState {
    const scores = {
      ...state.scores,
      [answeringPlayerId]: (state.scores[answeringPlayerId] ?? 0) + 1
    };
    const result: PublicSymbolMatchResult | null =
      (scores[answeringPlayerId] ?? 0) >= state.targetScore
        ? {
            kind: "winner",
            winnerPlayerId: answeringPlayerId,
            reason: "target-score"
          }
        : null;

    return {
      ...this.toBaseState(state),
      scores,
      status: "challenge-feedback",
      challenge: state.challenge,
      wrongFeedback: this.pruneWrongFeedback(state.wrongFeedback, now),
      correctFeedback: {
        challengeId: state.challenge.challengeId,
        answeringPlayerId,
        pointRecipientPlayerId: answeringPlayerId,
        selectedCardId,
        symbolId,
        expiresAt: now + this.correctFeedbackMs
      },
      result
    };
  }

  private resolveScheduledTransition(
    room: SymbolMatchRoom,
    descriptor: TransitionDescriptor
  ): SymbolMatchGameState | null {
    const state = room.game.state;
    if (state === null) {
      return null;
    }

    switch (state.status) {
      case "countdown":
        return descriptor.deadline === state.countdownEndsAt
          ? this.dealNextChallenge(state)
          : null;
      case "challenge-feedback":
        if (descriptor.deadline !== state.correctFeedback.expiresAt) {
          return null;
        }
        return state.result === null
          ? this.dealNextChallenge(state)
          : this.finishWithResult(state, state.result);
      case "ending-feedback":
        return descriptor.deadline === state.feedbackEndsAt
          ? this.finishWithResult(state, state.result)
          : null;
      case "paused":
        return descriptor.deadline === state.graceEndsAt
          ? this.resolvePausedDeadline(room, state)
          : null;
      case "challenge-open":
      case "finished":
        return null;
      default:
        return assertNever(state);
    }
  }

  private resolvePausedDeadline(
    room: SymbolMatchRoom,
    state: SymbolMatchPausedState
  ): SymbolMatchGameState {
    const disconnectedPlayerIds = this.getDisconnectedPlayerIds(
      room,
      state.playerOrder
    );
    if (disconnectedPlayerIds.length === 0) {
      return {
        ...this.toBaseState(state),
        status: "countdown",
        countdownEndsAt: this.now() + this.countdownMs
      };
    }
    if (disconnectedPlayerIds.length === state.playerOrder.length) {
      return this.finishWithResult(state, {
        kind: "abandoned",
        winnerPlayerId: null,
        reason: "all-disconnected"
      });
    }

    const connectedWinner = state.playerOrder.find(
      (playerId) => !disconnectedPlayerIds.includes(playerId)
    );
    if (connectedWinner === undefined) {
      throw new Error("Unable to identify the connected forfeit winner.");
    }
    return this.finishWithResult(state, {
      kind: "winner",
      winnerPlayerId: connectedWinner,
      reason: "forfeit"
    });
  }

  private getTransitionDescriptor(
    state: SymbolMatchGameState
  ): TransitionDescriptor | null {
    switch (state.status) {
      case "countdown":
        return {
          key: `${state.matchId}:countdown:${state.countdownEndsAt}`,
          deadline: state.countdownEndsAt
        };
      case "challenge-feedback":
        return {
          key: `${state.challenge.challengeId}:correct:${state.correctFeedback.expiresAt}`,
          deadline: state.correctFeedback.expiresAt
        };
      case "ending-feedback":
        return {
          key: `${state.challenge.challengeId}:ending:${state.feedbackEndsAt}`,
          deadline: state.feedbackEndsAt
        };
      case "paused":
        return {
          key: `${state.matchId}:paused:${state.graceEndsAt}:${state.disconnectedPlayerIds.join(",")}`,
          deadline: state.graceEndsAt
        };
      case "challenge-open":
      case "finished":
        return null;
      default:
        return assertNever(state);
    }
  }

  private dealNextChallenge(
    state: SymbolMatchGameState
  ): SymbolMatchChallengeOpenState | SymbolMatchFinishedState {
    if (!this.hasCompletePair(state)) {
      return this.finishByDeckScore(state);
    }

    const hostCardId = state.drawOrder[state.nextCardIndex];
    const guestCardId = state.drawOrder[state.nextCardIndex + 1];
    if (hostCardId === undefined || guestCardId === undefined) {
      return this.finishByDeckScore(state);
    }
    const hostCard = this.createPublicCard(hostCardId, state.playerOrder[0]);
    const guestCard = this.createPublicCard(guestCardId, state.playerOrder[1]);
    const sharedSymbolId = this.findSharedSymbol(hostCard, guestCard);
    const challengeId = `${state.matchId}-c${state.nextChallengeNumber}`;

    return {
      ...this.toBaseState(state),
      status: "challenge-open",
      nextCardIndex: state.nextCardIndex + 2,
      nextChallengeNumber: state.nextChallengeNumber + 1,
      challenge: {
        challengeId,
        cards: [hostCard, guestCard],
        sharedSymbolId
      },
      wrongFeedback: [],
      recentWrongSelections: {}
    };
  }

  private createPublicCard(
    cardId: number,
    assignedPlayerId: string
  ): PublicSymbolMatchCard {
    const card = SYMBOL_MATCH_DECK[cardId];
    const layout = SYMBOL_MATCH_PRINTED_LAYOUTS[cardId];
    if (
      card === undefined ||
      layout === undefined ||
      card.id !== cardId ||
      layout.cardId !== cardId
    ) {
      throw new Error(`Missing committed Symbol Match card ${cardId}.`);
    }

    return {
      cardId,
      assignedPlayerId,
      wholeRotationDegrees: this.randomRotation(),
      printedSymbols: layout.printedSymbols.map((placement) => ({
        ...placement
      }))
    };
  }

  private findSharedSymbol(
    firstCard: PublicSymbolMatchCard,
    secondCard: PublicSymbolMatchCard
  ): SymbolMatchSymbolId {
    const secondSymbols = new Set(
      secondCard.printedSymbols.map(({ symbolId }) => symbolId)
    );
    const sharedSymbols = firstCard.printedSymbols
      .map(({ symbolId }) => symbolId)
      .filter((symbolId) => secondSymbols.has(symbolId));
    if (sharedSymbols.length !== 1 || sharedSymbols[0] === undefined) {
      throw new Error(
        `Cards ${firstCard.cardId} and ${secondCard.cardId} do not share exactly one symbol.`
      );
    }
    return sharedSymbols[0];
  }

  private randomRotation(): number {
    return Math.floor(normalizedRandom(this.rng) * 3_600_000) / 10_000;
  }

  private createPausedState(
    state: SymbolMatchGameState,
    room: SymbolMatchRoom,
    now: number
  ): SymbolMatchPausedState {
    return {
      ...this.toBaseState(state),
      status: "paused",
      disconnectedPlayerIds: this.getDisconnectedPlayerIds(
        room,
        state.playerOrder
      ),
      graceEndsAt: now + this.reconnectGraceMs
    };
  }

  private getDisconnectedPlayerIds(
    room: SymbolMatchRoom,
    playerOrder: SymbolMatchPlayerOrder
  ): string[] {
    return playerOrder.filter(
      (playerId) => room.players[playerId]?.connected !== true
    );
  }

  private getOpponentPlayerId(
    playerOrder: SymbolMatchPlayerOrder,
    playerId: string
  ): string {
    const opponent = playerOrder.find((candidate) => candidate !== playerId);
    if (opponent === undefined || !playerOrder.includes(playerId)) {
      throw new Error(`Player ${playerId} is not seated in Symbol Match.`);
    }
    return opponent;
  }

  private hasCompletePair(state: SymbolMatchGameState): boolean {
    return state.nextCardIndex + 1 < state.drawOrder.length;
  }

  private finishByDeckScore(
    state: SymbolMatchGameState
  ): SymbolMatchFinishedState {
    const [firstPlayerId, secondPlayerId] = state.playerOrder;
    const firstScore = state.scores[firstPlayerId] ?? 0;
    const secondScore = state.scores[secondPlayerId] ?? 0;
    if (firstScore === secondScore) {
      return this.finishWithResult(state, {
        kind: "tie",
        winnerPlayerId: null,
        reason: "deck-exhausted"
      });
    }
    return this.finishWithResult(state, {
      kind: "winner",
      winnerPlayerId: firstScore > secondScore ? firstPlayerId : secondPlayerId,
      reason: "deck-score"
    });
  }

  private finishWithResult(
    state: SymbolMatchGameState,
    result: PublicSymbolMatchResult
  ): SymbolMatchFinishedState {
    return {
      ...this.toBaseState(state),
      status: "finished",
      result
    };
  }

  private toBaseState(state: SymbolMatchGameState): SymbolMatchGameStateBase {
    return {
      matchId: state.matchId,
      deckVersion: state.deckVersion,
      printedLayoutsVersion: state.printedLayoutsVersion,
      targetScore: state.targetScore,
      playerOrder: [...state.playerOrder],
      scores: { ...state.scores },
      drawOrder: [...state.drawOrder],
      nextCardIndex: state.nextCardIndex,
      setAsideCardId: state.setAsideCardId,
      nextChallengeNumber: state.nextChallengeNumber,
      nextAttemptNumber: state.nextAttemptNumber
    };
  }

  private toPublicScores(
    state: SymbolMatchGameState
  ): PublicSymbolMatchPlayerScore[] {
    return state.playerOrder.map((playerId) => ({
      playerId,
      points: state.scores[playerId] ?? 0
    }));
  }

  private toPublicChallenge(
    challenge: SymbolMatchPrivateChallenge
  ): PublicSymbolMatchChallenge {
    return {
      challengeId: challenge.challengeId,
      cards: [
        this.clonePublicCard(challenge.cards[0]),
        this.clonePublicCard(challenge.cards[1])
      ]
    };
  }

  private clonePublicCard(card: PublicSymbolMatchCard): PublicSymbolMatchCard {
    return {
      ...card,
      printedSymbols: card.printedSymbols.map((placement) => ({
        ...placement
      }))
    };
  }

  private pruneWrongFeedback(
    feedback: PublicSymbolMatchWrongFeedback[],
    now: number
  ): PublicSymbolMatchWrongFeedback[] {
    return feedback
      .filter((entry) => entry.expiresAt > now)
      .map((entry) => ({ ...entry }));
  }

  private cloneResult(
    result: PublicSymbolMatchResult
  ): PublicSymbolMatchResult {
    return { ...result };
  }

  private clearScheduledTransition(roomCode: string): void {
    const scheduled = this.scheduledTransitions.get(roomCode);
    if (scheduled === undefined) {
      return;
    }
    clearTimeout(scheduled.timer);
    this.scheduledTransitions.delete(roomCode);
  }
}
