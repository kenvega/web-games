import {
  CARD_BANK_CARD_COUNTS,
  CARD_BANK_CARD_VALUES,
  type CardBankCardCounts,
  type CardBankCardValue,
  type CardBankGameAction,
  type PublicCardBankGameState,
  type PublicCardBankPendingBust,
  type PublicCardBankPendingSteal,
  type PublicCardBankStanding
} from "@multiplayer-blueprint/shared";
import type {
  GameActionResult,
  CardBankGameModuleContract
} from "../GameModule.js";
import type { Room } from "../../rooms/types.js";

type CardBankPlayerState = {
  playerId: string;
  activeCards: CardBankCardCounts;
  bankedCards: CardBankCardCounts;
};

type CardBankPendingSteal = {
  drawnValue: CardBankCardValue;
  candidates: {
    playerId: string;
    count: number;
  }[];
};

type CardBankPendingBust = {
  playerId: string;
  cardValue: CardBankCardValue;
};

export type CardBankGameState = {
  status: "playing" | "finished";
  turnPhase:
    | "awaiting-draw"
    | "awaiting-steal"
    | "awaiting-decision"
    | "revealing-bust"
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

export type CardBankGameOptions = {
  rng?: () => number;
  deckFactory?: () => CardBankCardValue[];
};

function createEmptyCounts(): CardBankCardCounts {
  return {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: 0
  };
}

function cloneCounts(counts: CardBankCardCounts): CardBankCardCounts {
  return {
    1: counts[1],
    2: counts[2],
    3: counts[3],
    4: counts[4],
    5: counts[5],
    6: counts[6],
    7: counts[7],
    8: counts[8],
    9: counts[9],
    10: counts[10]
  };
}

function addCards(
  counts: CardBankCardCounts,
  value: CardBankCardValue,
  amount: number
): void {
  counts[value] += amount;
}

function removeCards(
  counts: CardBankCardCounts,
  value: CardBankCardValue,
  amount: number
): void {
  counts[value] = Math.max(0, counts[value] - amount);
}

function getCardCount(counts: CardBankCardCounts): number {
  return CARD_BANK_CARD_VALUES.reduce((total, value) => total + counts[value], 0);
}

function getScore(counts: CardBankCardCounts): number {
  return CARD_BANK_CARD_VALUES.reduce(
    (total, value) => total + value * counts[value],
    0
  );
}

function cardsFromCounts(counts: CardBankCardCounts): CardBankCardValue[] {
  return CARD_BANK_CARD_VALUES.flatMap((value) =>
    Array.from({ length: counts[value] }, () => value)
  );
}

function buildDeck(): CardBankCardValue[] {
  return CARD_BANK_CARD_VALUES.flatMap((value) =>
    Array.from({ length: CARD_BANK_CARD_COUNTS[value] }, () => value)
  );
}

function shuffleDeck(
  deck: CardBankCardValue[],
  rng: () => number
): CardBankCardValue[] {
  const shuffled = [...deck];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex] as CardBankCardValue,
      shuffled[index] as CardBankCardValue
    ];
  }

  return shuffled;
}

function hasBustForValue(
  activeCards: CardBankCardCounts,
  value: CardBankCardValue
): boolean {
  return activeCards[value] >= 2 && getCardCount(activeCards) >= 3;
}

function compareStandings(
  left: PublicCardBankStanding,
  right: PublicCardBankStanding
): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  for (const value of CARD_BANK_CARD_VALUES) {
    const difference = right.bankedCards[value] - left.bankedCards[value];
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

export class CardBankGameModule
  implements CardBankGameModuleContract<CardBankGameState>
{
  private readonly rng: () => number;
  private readonly deckFactory: (() => CardBankCardValue[]) | null;

  constructor(options: CardBankGameOptions = {}) {
    this.rng = options.rng ?? Math.random;
    this.deckFactory = options.deckFactory ?? null;
  }

  createInitialState(room: Room): CardBankGameState {
    return this.start(room);
  }

  start(room: Room): CardBankGameState {
    const turnOrder = Object.values(room.players)
      .sort((left, right) => left.joinedAt - right.joinedAt)
      .map((player) => player.id);
    const players: Record<string, CardBankPlayerState> = Object.fromEntries(
      turnOrder.map((playerId) => [
        playerId,
        {
          playerId,
          activeCards: createEmptyCounts(),
          bankedCards: createEmptyCounts()
        }
      ])
    );
    const deck =
      this.deckFactory === null
        ? shuffleDeck(buildDeck(), this.rng)
        : [...this.deckFactory()];
    const currentPlayerIndex =
      turnOrder.length === 0 ? 0 : Math.floor(this.rng() * turnOrder.length);

    return {
      status: "playing",
      turnPhase: "awaiting-draw",
      deck,
      discard: [],
      turnOrder,
      currentPlayerIndex,
      players,
      pendingSteal: null,
      pendingBust: null,
      finalStandings: null,
      winnerPlayerIds: []
    };
  }

  handleAction(input: {
    room: Room;
    playerId: string;
    action: CardBankGameAction;
    now: number;
  }): GameActionResult<CardBankGameState> {
    const state = input.room.gameState;
    if (state === null || state.status === "finished") {
      return {
        accepted: false,
        errorCode: "ROUND_NOT_ACTIVE",
        message: "There is no active game."
      };
    }

    if (this.getCurrentPlayerId(state) !== input.playerId) {
      return {
        accepted: false,
        errorCode: "NOT_YOUR_TURN",
        message: "It is not your turn."
      };
    }

    switch (input.action.type) {
      case "draw-card":
        return this.drawCard(input.room, state);
      case "resolve-steal":
        return this.resolveSteal(input.room, state, input.action.steal);
      case "stop-turn":
        return this.stopTurn(input.room, state);
      default:
        return {
          accepted: false,
          errorCode: "INVALID_GAME_ACTION",
          message: "That game action is not valid."
        };
    }
  }

  handleDisconnectedActivePlayer(room: Room): CardBankGameState | null {
    const state = room.gameState;
    if (state === null || state.status === "finished") {
      return null;
    }

    const currentPlayerId = this.getCurrentPlayerId(state);
    if (currentPlayerId === null) {
      return null;
    }

    const currentPlayer = room.players[currentPlayerId];
    if (currentPlayer === undefined || currentPlayer.connected) {
      return null;
    }

    if (state.turnPhase === "finished" || state.turnPhase === "revealing-bust") {
      return state;
    }

    return this.advanceTurn(room, {
      ...state,
      pendingSteal: null,
      pendingBust: null,
      turnPhase: "awaiting-draw"
    });
  }

  getPlayerScores(state: CardBankGameState): Record<string, number> {
    return Object.fromEntries(
      Object.values(state.players).map((player) => [
        player.playerId,
        getScore(player.bankedCards)
      ])
    );
  }

  toPublicState(state: CardBankGameState): PublicCardBankGameState {
    return {
      status: state.status,
      currentPlayerId:
        state.status === "finished" ? null : this.getCurrentPlayerId(state),
      turnPhase: state.turnPhase,
      deckCount: state.deck.length,
      discardCount: state.discard.length,
      players: state.turnOrder.map((playerId) => {
        const player = state.players[playerId] as CardBankPlayerState;
        return {
          playerId,
          activeCards: cloneCounts(player.activeCards),
          activeCount: getCardCount(player.activeCards),
          securedScore: getScore(player.bankedCards)
        };
      }),
      pendingSteal:
        state.pendingSteal === null
          ? null
          : this.toPublicPendingSteal(state.pendingSteal),
      pendingBust:
        state.pendingBust === null ? null : this.toPublicPendingBust(state.pendingBust),
      finalStandings: state.finalStandings,
      winnerPlayerIds: state.winnerPlayerIds
    };
  }

  resolvePendingBust(room: Room): CardBankGameState | null {
    const state = room.gameState;
    if (
      state === null ||
      state.status === "finished" ||
      state.turnPhase !== "revealing-bust" ||
      state.pendingBust === null
    ) {
      return null;
    }

    return this.resolveBust(room, state, state.pendingBust.playerId);
  }

  dispose(): void {
    return;
  }

  private drawCard(
    room: Room,
    state: CardBankGameState
  ): GameActionResult<CardBankGameState> {
    if (
      state.turnPhase !== "awaiting-draw" &&
      state.turnPhase !== "awaiting-decision"
    ) {
      return {
        accepted: false,
        errorCode: "INVALID_TURN_PHASE",
        message: "You cannot draw right now."
      };
    }

    const currentPlayerId = this.getCurrentPlayerId(state);
    if (currentPlayerId === null) {
      return {
        accepted: false,
        errorCode: "ROUND_NOT_ACTIVE",
        message: "There is no active player."
      };
    }

    if (state.deck.length === 0) {
      return {
        accepted: true,
        nextState: this.finishGame(state)
      };
    }

    const drawnValue = state.deck[0] as CardBankCardValue;
    const remainingDeck = state.deck.slice(1);
    const currentPlayer = state.players[currentPlayerId] as CardBankPlayerState;
    const nextPlayer = {
      ...currentPlayer,
      activeCards: cloneCounts(currentPlayer.activeCards)
    };
    const hadValueBeforeDraw = nextPlayer.activeCards[drawnValue] > 0;
    addCards(nextPlayer.activeCards, drawnValue, 1);

    const nextState: CardBankGameState = {
      ...state,
      deck: remainingDeck,
      players: {
        ...state.players,
        [currentPlayerId]: nextPlayer
      },
      pendingSteal: null,
      pendingBust: null
    };

    if (
      hadValueBeforeDraw &&
      hasBustForValue(nextPlayer.activeCards, drawnValue)
    ) {
      return {
        accepted: true,
        nextState: this.revealBust(nextState, currentPlayerId, drawnValue)
      };
    }

    const candidates = this.getStealCandidates(nextState, drawnValue);
    if (candidates.length > 0) {
      return {
        accepted: true,
        nextState: {
          ...nextState,
          turnPhase: "awaiting-steal",
          pendingSteal: {
            drawnValue,
            candidates
          }
        }
      };
    }

    if (nextState.deck.length === 0) {
      return {
        accepted: true,
        nextState: this.finishGame(nextState)
      };
    }

    return {
      accepted: true,
      nextState: {
        ...nextState,
        turnPhase: "awaiting-decision"
      }
    };
  }

  private resolveSteal(
    room: Room,
    state: CardBankGameState,
    steal: boolean
  ): GameActionResult<CardBankGameState> {
    if (state.turnPhase !== "awaiting-steal" || state.pendingSteal === null) {
      return {
        accepted: false,
        errorCode: "INVALID_TURN_PHASE",
        message: "There is no steal to resolve."
      };
    }

    const currentPlayerId = this.getCurrentPlayerId(state);
    if (currentPlayerId === null) {
      return {
        accepted: false,
        errorCode: "ROUND_NOT_ACTIVE",
        message: "There is no active player."
      };
    }

    const nextState: CardBankGameState = {
      ...state,
      players: { ...state.players },
      pendingSteal: null,
      pendingBust: null
    };

    if (steal) {
      const currentPlayer = nextState.players[
        currentPlayerId
      ] as CardBankPlayerState;
      const nextCurrentPlayer = {
        ...currentPlayer,
        activeCards: cloneCounts(currentPlayer.activeCards)
      };

      for (const candidate of state.pendingSteal.candidates) {
        const opponent = nextState.players[candidate.playerId];
        if (opponent === undefined) {
          continue;
        }

        const liveCount = opponent.activeCards[state.pendingSteal.drawnValue];
        if (liveCount <= 0) {
          continue;
        }

        const nextOpponent = {
          ...opponent,
          activeCards: cloneCounts(opponent.activeCards)
        };
        removeCards(
          nextOpponent.activeCards,
          state.pendingSteal.drawnValue,
          liveCount
        );
        addCards(
          nextCurrentPlayer.activeCards,
          state.pendingSteal.drawnValue,
          liveCount
        );
        nextState.players[candidate.playerId] = nextOpponent;
      }

      nextState.players[currentPlayerId] = nextCurrentPlayer;

      if (
        hasBustForValue(
          nextCurrentPlayer.activeCards,
          state.pendingSteal.drawnValue
        )
      ) {
        return {
          accepted: true,
          nextState: this.revealBust(
            nextState,
            currentPlayerId,
            state.pendingSteal.drawnValue
          )
        };
      }
    }

    if (nextState.deck.length === 0) {
      return {
        accepted: true,
        nextState: this.finishGame(nextState)
      };
    }

    return {
      accepted: true,
      nextState: {
        ...nextState,
        turnPhase: "awaiting-decision"
      }
    };
  }

  private stopTurn(
    room: Room,
    state: CardBankGameState
  ): GameActionResult<CardBankGameState> {
    if (state.turnPhase !== "awaiting-decision") {
      return {
        accepted: false,
        errorCode: "INVALID_TURN_PHASE",
        message: "You cannot stop right now."
      };
    }

    return {
      accepted: true,
      nextState: this.advanceTurn(room, state)
    };
  }

  private revealBust(
    state: CardBankGameState,
    playerId: string,
    cardValue: CardBankCardValue
  ): CardBankGameState {
    return {
      ...state,
      turnPhase: "revealing-bust",
      pendingSteal: null,
      pendingBust: {
        playerId,
        cardValue
      }
    };
  }

  private resolveBust(
    room: Room,
    state: CardBankGameState,
    playerId: string
  ): CardBankGameState {
    const player = state.players[playerId] as CardBankPlayerState;
    const discardedCards = cardsFromCounts(player.activeCards);
    const nextPlayer = {
      ...player,
      activeCards: createEmptyCounts()
    };
    const nextState = {
      ...state,
      discard: [...state.discard, ...discardedCards],
      players: {
        ...state.players,
        [playerId]: nextPlayer
      },
      pendingSteal: null,
      pendingBust: null
    };

    if (nextState.deck.length === 0) {
      return this.finishGame(nextState);
    }

    return this.advanceTurn(room, nextState);
  }

  private advanceTurn(room: Room, state: CardBankGameState): CardBankGameState {
    if (state.turnOrder.length === 0) {
      return state;
    }

    let nextState: CardBankGameState = {
      ...state,
      currentPlayerIndex:
        (state.currentPlayerIndex + 1) % state.turnOrder.length,
      turnPhase: "awaiting-draw",
      pendingSteal: null,
      pendingBust: null
    };

    for (let attempts = 0; attempts < state.turnOrder.length; attempts += 1) {
      nextState = this.bankActiveCardsForCurrentPlayer(nextState);
      const currentPlayerId = this.getCurrentPlayerId(nextState);
      const roomPlayer =
        currentPlayerId === null ? undefined : room.players[currentPlayerId];

      if (roomPlayer === undefined || roomPlayer.connected) {
        return nextState;
      }

      nextState = {
        ...nextState,
        currentPlayerIndex:
          (nextState.currentPlayerIndex + 1) % nextState.turnOrder.length
      };
    }

    return nextState;
  }

  private bankActiveCardsForCurrentPlayer(
    state: CardBankGameState
  ): CardBankGameState {
    const currentPlayerId = this.getCurrentPlayerId(state);
    if (currentPlayerId === null) {
      return state;
    }

    const player = state.players[currentPlayerId] as CardBankPlayerState;
    if (getCardCount(player.activeCards) === 0) {
      return state;
    }

    const nextBankedCards = cloneCounts(player.bankedCards);
    for (const value of CARD_BANK_CARD_VALUES) {
      addCards(nextBankedCards, value, player.activeCards[value]);
    }

    return {
      ...state,
      players: {
        ...state.players,
        [currentPlayerId]: {
          ...player,
          activeCards: createEmptyCounts(),
          bankedCards: nextBankedCards
        }
      }
    };
  }

  private finishGame(state: CardBankGameState): CardBankGameState {
    const players = { ...state.players };
    for (const playerId of state.turnOrder) {
      const player = players[playerId] as CardBankPlayerState;
      const nextBankedCards = cloneCounts(player.bankedCards);
      for (const value of CARD_BANK_CARD_VALUES) {
        addCards(nextBankedCards, value, player.activeCards[value]);
      }

      players[playerId] = {
        ...player,
        activeCards: createEmptyCounts(),
        bankedCards: nextBankedCards
      };
    }

    const sortedStandings = state.turnOrder
      .map((playerId) => {
        const player = players[playerId] as CardBankPlayerState;
        return {
          playerId,
          rank: 0,
          score: getScore(player.bankedCards),
          bankedCards: cloneCounts(player.bankedCards)
        };
      })
      .sort(compareStandings);

    let currentRank = 0;
    const finalStandings = sortedStandings.map((standing, index) => {
      const previous = sortedStandings[index - 1];
      if (previous === undefined || compareStandings(previous, standing) !== 0) {
        currentRank = index + 1;
      }

      return {
        ...standing,
        rank: currentRank
      };
    });

    const winnerPlayerIds = finalStandings
      .filter((standing) => standing.rank === 1)
      .map((standing) => standing.playerId);

    return {
      ...state,
      status: "finished",
      turnPhase: "finished",
      currentPlayerIndex: 0,
      players,
      pendingSteal: null,
      pendingBust: null,
      finalStandings,
      winnerPlayerIds
    };
  }

  private getStealCandidates(
    state: CardBankGameState,
    drawnValue: CardBankCardValue
  ): CardBankPendingSteal["candidates"] {
    const currentPlayerId = this.getCurrentPlayerId(state);
    return state.turnOrder.flatMap((playerId) => {
      if (playerId === currentPlayerId) {
        return [];
      }

      const count = state.players[playerId]?.activeCards[drawnValue] ?? 0;
      return count > 0
        ? [
            {
              playerId,
              count
            }
          ]
        : [];
    });
  }

  private toPublicPendingSteal(
    pendingSteal: CardBankPendingSteal
  ): PublicCardBankPendingSteal {
    return {
      drawnValue: pendingSteal.drawnValue,
      candidates: pendingSteal.candidates.map((candidate) => ({ ...candidate })),
      totalCount: pendingSteal.candidates.reduce(
        (total, candidate) => total + candidate.count,
        0
      )
    };
  }

  private toPublicPendingBust(
    pendingBust: CardBankPendingBust
  ): PublicCardBankPendingBust {
    return {
      playerId: pendingBust.playerId,
      cardValue: pendingBust.cardValue
    };
  }

  private getCurrentPlayerId(state: CardBankGameState): string | null {
    return state.turnOrder[state.currentPlayerIndex] ?? null;
  }
}
