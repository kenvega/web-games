import {
  SYMBOL_MATCH_GAME_ID,
  type SymbolMatchGameAction,
  type SymbolMatchSymbolId,
  type SymbolMatchTargetScore
} from "@multiplayer-blueprint/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SymbolMatchGameModule } from "./symbolMatchGame.js";
import type {
  SymbolMatchChallengeOpenState,
  SymbolMatchGameState,
  SymbolMatchRoom
} from "./types.js";

const aliceId = "11111111-1111-4111-8111-111111111111";
const bobId = "22222222-2222-4222-8222-222222222222";
const charlieId = "33333333-3333-4333-8333-333333333333";

const COUNTDOWN_MS = 10;
const REPEAT_WINDOW_MS = 5;
const WRONG_FEEDBACK_MS = 5;
const CORRECT_FEEDBACK_MS = 9;
const RECONNECT_GRACE_MS = 20;

type Harness = ReturnType<typeof createHarness>;

function createRoom(targetScore: SymbolMatchTargetScore = 5): SymbolMatchRoom {
  return {
    code: "23456789AB",
    gameId: SYMBOL_MATCH_GAME_ID,
    hostPlayerId: aliceId,
    phase: "waiting",
    players: {
      [aliceId]: {
        id: aliceId,
        displayName: "Alice",
        connected: true,
        joinedAt: 1,
        socketId: "socket-a"
      },
      [bobId]: {
        id: bobId,
        displayName: "Bob",
        connected: true,
        joinedAt: 2,
        socketId: "socket-b"
      }
    },
    chatMessages: [],
    game: {
      settings: { targetScore },
      state: null
    },
    version: 0,
    createdAt: 1,
    updatedAt: 1
  };
}

function createHarness(options: { rng?: () => number } = {}) {
  let now = 1_000;
  const room = createRoom();
  const module = new SymbolMatchGameModule({
    rng: options.rng ?? (() => 0),
    now: () => now,
    countdownMs: COUNTDOWN_MS,
    wrongRepeatWindowMs: REPEAT_WINDOW_MS,
    wrongFeedbackMs: WRONG_FEEDBACK_MS,
    correctFeedbackMs: CORRECT_FEEDBACK_MS,
    reconnectGraceMs: RECONNECT_GRACE_MS
  });

  const sync = () => {
    module.syncScheduledTransition({
      room,
      onTransition: (nextState) => {
        room.game.state = nextState;
        sync();
      }
    });
  };

  const setState = (state: SymbolMatchGameState) => {
    room.game.state = state;
    sync();
  };

  const elapse = (milliseconds: number) => {
    now += milliseconds;
    vi.advanceTimersByTime(milliseconds);
  };

  const start = () => {
    room.phase = "playing";
    setState(module.start(room, now));
    return requireState(room);
  };

  const openFirstChallenge = () => {
    start();
    elapse(COUNTDOWN_MS);
    return requireOpenState(room);
  };

  const act = (
    playerId: string,
    action: SymbolMatchGameAction,
    options: { commit?: boolean } = {}
  ) => {
    const result = module.handleAction({ room, playerId, action, now });
    if (result.accepted && options.commit !== false) {
      setState(result.nextState);
    }
    return result;
  };

  const disconnect = (playerId: string) => {
    const player = room.players[playerId];
    if (player === undefined) {
      throw new Error(`Unknown test player ${playerId}.`);
    }
    player.connected = false;
    player.socketId = null;
    const nextState = module.handlePlayerDisconnected({ room, playerId, now });
    if (nextState !== null) {
      setState(nextState);
    }
    return nextState;
  };

  const reconnect = (playerId: string) => {
    const player = room.players[playerId];
    if (player === undefined) {
      throw new Error(`Unknown test player ${playerId}.`);
    }
    player.connected = true;
    player.socketId = `socket-${playerId}`;
    const nextState = module.handlePlayerConnected({ room, playerId, now });
    if (nextState !== null) {
      setState(nextState);
    }
    return nextState;
  };

  return {
    act,
    disconnect,
    elapse,
    getNow: () => now,
    module,
    openFirstChallenge,
    reconnect,
    room,
    setState,
    start
  };
}

function requireState(room: SymbolMatchRoom): SymbolMatchGameState {
  if (room.game.state === null) {
    throw new Error("Expected a Symbol Match state.");
  }
  return room.game.state;
}

function requireOpenState(
  room: SymbolMatchRoom
): SymbolMatchChallengeOpenState {
  const state = requireState(room);
  if (state.status !== "challenge-open") {
    throw new Error(`Expected challenge-open, received ${state.status}.`);
  }
  return state;
}

function assignedCard(state: SymbolMatchChallengeOpenState, playerId: string) {
  const card = state.challenge.cards.find(
    (candidate) => candidate.assignedPlayerId === playerId
  );
  if (card === undefined) {
    throw new Error(`No card was assigned to ${playerId}.`);
  }
  return card;
}

function correctAction(
  state: SymbolMatchChallengeOpenState
): SymbolMatchGameAction {
  return {
    type: "select-symbol",
    challengeId: state.challenge.challengeId,
    symbolId: state.challenge.sharedSymbolId
  };
}

function wrongSymbols(
  state: SymbolMatchChallengeOpenState,
  playerId: string
): SymbolMatchSymbolId[] {
  return assignedCard(state, playerId)
    .printedSymbols.map(({ symbolId }) => symbolId)
    .filter((symbolId) => symbolId !== state.challenge.sharedSymbolId);
}

function wrongAction(
  state: SymbolMatchChallengeOpenState,
  playerId: string,
  index = 0
): SymbolMatchGameAction {
  const symbolId = wrongSymbols(state, playerId)[index];
  if (symbolId === undefined) {
    throw new Error("Expected a wrong symbol on the assigned card.");
  }
  return {
    type: "select-symbol",
    challengeId: state.challenge.challengeId,
    symbolId
  };
}

function score(state: SymbolMatchGameState, playerId: string): number {
  return state.scores[playerId] ?? 0;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SymbolMatchGameModule match creation", () => {
  it("requires exactly two connected players and valid settings", () => {
    const harness = createHarness();

    delete harness.room.players[bobId];
    expect(() => harness.module.start(harness.room, 1_000)).toThrow(
      "exactly two connected players"
    );

    harness.room.players[bobId] = {
      id: bobId,
      displayName: "Bob",
      connected: false,
      joinedAt: 2,
      socketId: null
    };
    expect(() => harness.module.start(harness.room, 1_000)).toThrow(
      "exactly two connected players"
    );

    harness.room.players[bobId].connected = true;
    harness.room.players[charlieId] = {
      id: charlieId,
      displayName: "Charlie",
      connected: true,
      joinedAt: 3,
      socketId: "socket-c"
    };
    expect(() => harness.module.start(harness.room, 1_000)).toThrow(
      "exactly two connected players"
    );

    delete harness.room.players[charlieId];
    harness.room.game.settings = { targetScore: 6 } as never;
    expect(() => harness.module.start(harness.room, 1_000)).toThrow(
      "invalid settings"
    );
  });

  it("freezes settings, shuffles 57 cards, sets one aside, and hides cards during countdown", () => {
    const harness = createHarness();
    harness.room.game.settings = { targetScore: 7 };
    const state = harness.start();

    expect(state.status).toBe("countdown");
    expect(state.targetScore).toBe(7);
    expect(state.scores).toEqual({ [aliceId]: 0, [bobId]: 0 });
    expect(state.drawOrder).toHaveLength(56);
    expect(new Set([...state.drawOrder, state.setAsideCardId]).size).toBe(57);
    expect(state.nextCardIndex).toBe(0);
    expect(harness.module.toPublicState(state)).toEqual({
      status: "countdown",
      targetScore: 7,
      scores: [
        { playerId: aliceId, points: 0 },
        { playerId: bobId, points: 0 }
      ],
      countdownEndsAt: 1_000 + COUNTDOWN_MS
    });

    harness.room.game.settings.targetScore = 10;
    expect(requireState(harness.room).targetScore).toBe(7);
  });

  it("deals host then guest, consumes two cards, and uses rotations in [0, 360)", () => {
    let rngCall = 0;
    const harness = createHarness({
      rng: () => {
        rngCall += 1;
        if (rngCall <= 56) {
          return 0;
        }
        return rngCall === 57 ? 0.25 : 0.999_999_99;
      }
    });
    const countdown = harness.start();
    harness.elapse(COUNTDOWN_MS);
    const open = requireOpenState(harness.room);

    expect(open.nextCardIndex).toBe(2);
    expect(open.challenge.cards[0]?.cardId).toBe(countdown.drawOrder[0]);
    expect(open.challenge.cards[0]?.assignedPlayerId).toBe(aliceId);
    expect(open.challenge.cards[1]?.cardId).toBe(countdown.drawOrder[1]);
    expect(open.challenge.cards[1]?.assignedPlayerId).toBe(bobId);
    expect(open.challenge.cards[0]?.wholeRotationDegrees).toBe(90);
    expect(open.challenge.cards[1]?.wholeRotationDegrees).toBe(359.9999);
    expect(
      open.challenge.cards.every(
        ({ wholeRotationDegrees }) =>
          wholeRotationDegrees >= 0 && wholeRotationDegrees < 360
      )
    ).toBe(true);
  });
});

describe("SymbolMatchGameModule selection processing", () => {
  it("rejects invalid phases, stale challenges, absent symbols, disconnected players, and malformed actions", () => {
    const harness = createHarness();
    const countdown = harness.start();
    const countdownResult = harness.module.handleAction({
      room: harness.room,
      playerId: aliceId,
      action: {
        type: "select-symbol",
        challengeId: "not-open",
        symbolId: "hammer"
      },
      now: harness.getNow()
    });
    expect(countdownResult).toMatchObject({
      accepted: false,
      errorCode: "INVALID_CHALLENGE_PHASE"
    });
    expect(countdown.status).toBe("countdown");

    harness.elapse(COUNTDOWN_MS);
    const open = requireOpenState(harness.room);
    expect(
      harness.act(aliceId, {
        ...correctAction(open),
        challengeId: "old-challenge"
      })
    ).toMatchObject({ accepted: false, errorCode: "STALE_CHALLENGE" });

    const opponentOnlySymbol = assignedCard(open, bobId).printedSymbols.find(
      ({ symbolId }) =>
        !assignedCard(open, aliceId).printedSymbols.some(
          (placement) => placement.symbolId === symbolId
        )
    )?.symbolId;
    expect(opponentOnlySymbol).toBeDefined();
    expect(
      harness.act(aliceId, {
        type: "select-symbol",
        challengeId: open.challenge.challengeId,
        symbolId: opponentOnlySymbol as SymbolMatchSymbolId
      })
    ).toMatchObject({ accepted: false, errorCode: "SYMBOL_NOT_ON_CARD" });

    harness.room.players[aliceId]!.connected = false;
    expect(harness.act(aliceId, correctAction(open))).toMatchObject({
      accepted: false,
      errorCode: "INVALID_GAME_ACTION"
    });

    expect(
      harness.module.actionSchema.safeParse({
        type: "select-symbol",
        challengeId: open.challenge.challengeId,
        symbolId: "not-a-symbol"
      }).success
    ).toBe(false);
  });

  it("scores every distinct mistake while suppressing only a rapid repeat", () => {
    const harness = createHarness();
    const open = harness.openFirstChallenge();
    const firstWrong = wrongAction(open, aliceId, 0);

    expect(harness.act(aliceId, firstWrong).accepted).toBe(true);
    let state = requireOpenState(harness.room);
    expect(score(state, bobId)).toBe(1);
    expect(state.wrongFeedback).toHaveLength(1);
    expect(state.wrongFeedback[0]).toMatchObject({
      answeringPlayerId: aliceId,
      pointRecipientPlayerId: bobId,
      symbolId: firstWrong.symbolId
    });

    harness.elapse(REPEAT_WINDOW_MS - 1);
    expect(harness.act(aliceId, firstWrong)).toMatchObject({
      accepted: false,
      errorCode: "DUPLICATE_SELECTION"
    });
    expect(score(requireOpenState(harness.room), bobId)).toBe(1);

    expect(harness.act(aliceId, wrongAction(open, aliceId, 1)).accepted).toBe(
      true
    );
    expect(score(requireOpenState(harness.room), bobId)).toBe(2);

    harness.elapse(1);
    expect(harness.act(aliceId, firstWrong).accepted).toBe(true);
    state = requireOpenState(harness.room);
    expect(score(state, bobId)).toBe(3);

    harness.elapse(WRONG_FEEDBACK_MS);
    expect(harness.module.toPublicState(state)).toMatchObject({
      status: "challenge-open",
      wrongFeedback: []
    });
  });

  it("allows wrong-before-correct to award two points and rejects correct-before-wrong", () => {
    const firstHarness = createHarness();
    const firstOpen = firstHarness.openFirstChallenge();
    expect(
      firstHarness.act(bobId, wrongAction(firstOpen, bobId)).accepted
    ).toBe(true);
    expect(firstHarness.act(aliceId, correctAction(firstOpen)).accepted).toBe(
      true
    );
    const feedback = requireState(firstHarness.room);
    expect(feedback.status).toBe("challenge-feedback");
    expect(score(feedback, aliceId)).toBe(2);
    if (feedback.status === "challenge-feedback") {
      expect(feedback.wrongFeedback).toHaveLength(1);
      expect(feedback.correctFeedback).toMatchObject({
        answeringPlayerId: aliceId,
        pointRecipientPlayerId: aliceId,
        symbolId: firstOpen.challenge.sharedSymbolId
      });
    }

    const secondHarness = createHarness();
    const secondOpen = secondHarness.openFirstChallenge();
    expect(secondHarness.act(aliceId, correctAction(secondOpen)).accepted).toBe(
      true
    );
    expect(
      secondHarness.act(bobId, wrongAction(secondOpen, bobId))
    ).toMatchObject({
      accepted: false,
      errorCode: "INVALID_CHALLENGE_PHASE"
    });
    expect(score(requireState(secondHarness.room), aliceId)).toBe(1);
  });

  it("finishes after the correct-answer delay when a correct point reaches target", () => {
    const harness = createHarness();
    const open = harness.openFirstChallenge();
    harness.setState({
      ...open,
      scores: { [aliceId]: 4, [bobId]: 0 }
    });

    expect(harness.act(aliceId, correctAction(open)).accepted).toBe(true);
    let state = requireState(harness.room);
    expect(state.status).toBe("challenge-feedback");
    expect(score(state, aliceId)).toBe(5);
    if (state.status === "challenge-feedback") {
      expect(state.result).toEqual({
        kind: "winner",
        winnerPlayerId: aliceId,
        reason: "target-score"
      });
    }

    harness.elapse(CORRECT_FEEDBACK_MS - 1);
    expect(requireState(harness.room).status).toBe("challenge-feedback");
    harness.elapse(1);
    state = requireState(harness.room);
    expect(state.status).toBe("finished");
    if (state.status === "finished") {
      expect(state.result.winnerPlayerId).toBe(aliceId);
    }
  });

  it("locks immediately and finishes after the X delay when a penalty reaches target", () => {
    const harness = createHarness();
    const open = harness.openFirstChallenge();
    harness.setState({
      ...open,
      scores: { [aliceId]: 4, [bobId]: 0 }
    });

    expect(harness.act(bobId, wrongAction(open, bobId)).accepted).toBe(true);
    let state = requireState(harness.room);
    expect(state.status).toBe("ending-feedback");
    expect(score(state, aliceId)).toBe(5);
    expect(harness.act(aliceId, correctAction(open))).toMatchObject({
      accepted: false,
      errorCode: "INVALID_CHALLENGE_PHASE"
    });

    harness.elapse(WRONG_FEEDBACK_MS - 1);
    expect(requireState(harness.room).status).toBe("ending-feedback");
    harness.elapse(1);
    state = requireState(harness.room);
    expect(state.status).toBe("finished");
  });
});

describe("SymbolMatchGameModule exhaustion and presence", () => {
  function openFinalPair(harness: Harness): SymbolMatchChallengeOpenState {
    const countdown = harness.start();
    harness.setState({
      ...countdown,
      nextCardIndex: countdown.drawOrder.length - 2
    });
    harness.elapse(COUNTDOWN_MS);
    const open = requireOpenState(harness.room);
    expect(open.nextCardIndex).toBe(open.drawOrder.length);
    return open;
  }

  it("finishes final-pair challenges by deck score or tie", () => {
    const winnerHarness = createHarness();
    const winnerOpen = openFinalPair(winnerHarness);
    winnerHarness.setState({
      ...winnerOpen,
      scores: { [aliceId]: 2, [bobId]: 0 }
    });
    winnerHarness.act(bobId, correctAction(winnerOpen));
    winnerHarness.elapse(CORRECT_FEEDBACK_MS);
    let state = requireState(winnerHarness.room);
    expect(state.status).toBe("finished");
    if (state.status === "finished") {
      expect(state.result).toEqual({
        kind: "winner",
        winnerPlayerId: aliceId,
        reason: "deck-score"
      });
    }

    const tieHarness = createHarness();
    const tieOpen = openFinalPair(tieHarness);
    tieHarness.setState({
      ...tieOpen,
      scores: { [aliceId]: 1, [bobId]: 0 }
    });
    tieHarness.act(bobId, correctAction(tieOpen));
    tieHarness.elapse(CORRECT_FEEDBACK_MS);
    state = requireState(tieHarness.room);
    expect(state.status).toBe("finished");
    if (state.status === "finished") {
      expect(state.result).toEqual({
        kind: "tie",
        winnerPlayerId: null,
        reason: "deck-exhausted"
      });
    }
  });

  it("counts the final displayed pair as used when an open challenge disconnects", () => {
    const harness = createHarness();
    const open = openFinalPair(harness);
    harness.setState({
      ...open,
      scores: { [aliceId]: 2, [bobId]: 1 }
    });

    harness.disconnect(bobId);
    const state = requireState(harness.room);
    expect(state.status).toBe("finished");
    if (state.status === "finished") {
      expect(state.result).toEqual({
        kind: "winner",
        winnerPlayerId: aliceId,
        reason: "deck-score"
      });
    }
  });

  it("pauses countdown without consuming cards and discards open or feedback challenges", () => {
    const countdownHarness = createHarness();
    countdownHarness.start();
    countdownHarness.disconnect(bobId);
    let state = requireState(countdownHarness.room);
    expect(state.status).toBe("paused");
    expect(state.nextCardIndex).toBe(0);
    countdownHarness.elapse(COUNTDOWN_MS);
    expect(requireState(countdownHarness.room).status).toBe("paused");

    const openHarness = createHarness();
    openHarness.openFirstChallenge();
    openHarness.disconnect(bobId);
    state = requireState(openHarness.room);
    expect(state.status).toBe("paused");
    expect(state.nextCardIndex).toBe(2);
    expect(state).not.toHaveProperty("challenge");

    const feedbackHarness = createHarness();
    const open = feedbackHarness.openFirstChallenge();
    feedbackHarness.act(aliceId, correctAction(open));
    feedbackHarness.disconnect(bobId);
    state = requireState(feedbackHarness.room);
    expect(state.status).toBe("paused");
    expect(state.nextCardIndex).toBe(2);
    expect(score(state, aliceId)).toBe(1);
    feedbackHarness.elapse(CORRECT_FEEDBACK_MS);
    expect(requireState(feedbackHarness.room).status).toBe("paused");
  });

  it("forfeits after one player's grace expires and preserves finished results", () => {
    const harness = createHarness();
    harness.start();
    harness.disconnect(bobId);
    harness.elapse(RECONNECT_GRACE_MS - 1);
    expect(requireState(harness.room).status).toBe("paused");
    harness.elapse(1);
    const finished = requireState(harness.room);
    expect(finished.status).toBe("finished");
    if (finished.status === "finished") {
      expect(finished.result).toEqual({
        kind: "winner",
        winnerPlayerId: aliceId,
        reason: "forfeit"
      });
    }

    harness.room.players[bobId]!.connected = true;
    expect(
      harness.module.handlePlayerConnected({
        room: harness.room,
        playerId: bobId,
        now: harness.getNow()
      })
    ).toBeNull();
    expect(requireState(harness.room)).toEqual(finished);

    expect(harness.disconnect(bobId)).toBeNull();
    expect(requireState(harness.room)).toEqual(finished);
  });

  it("abandons when both remain disconnected and gives a returning player a fresh grace interval", () => {
    const abandonedHarness = createHarness();
    abandonedHarness.start();
    abandonedHarness.disconnect(aliceId);
    abandonedHarness.elapse(4);
    abandonedHarness.disconnect(bobId);
    abandonedHarness.elapse(RECONNECT_GRACE_MS - 1);
    expect(requireState(abandonedHarness.room).status).toBe("paused");
    abandonedHarness.elapse(1);
    let state = requireState(abandonedHarness.room);
    expect(state.status).toBe("finished");
    if (state.status === "finished") {
      expect(state.result).toEqual({
        kind: "abandoned",
        winnerPlayerId: null,
        reason: "all-disconnected"
      });
    }

    const reconnectHarness = createHarness();
    reconnectHarness.start();
    reconnectHarness.disconnect(aliceId);
    reconnectHarness.elapse(4);
    reconnectHarness.disconnect(bobId);
    reconnectHarness.elapse(4);
    reconnectHarness.reconnect(aliceId);
    state = requireState(reconnectHarness.room);
    expect(state.status).toBe("paused");
    if (state.status === "paused") {
      expect(state.disconnectedPlayerIds).toEqual([bobId]);
      expect(state.graceEndsAt).toBe(
        reconnectHarness.getNow() + RECONNECT_GRACE_MS
      );
    }
    reconnectHarness.elapse(RECONNECT_GRACE_MS - 1);
    expect(requireState(reconnectHarness.room).status).toBe("paused");
  });

  it("starts a fresh countdown after both players return and deals new unused cards", () => {
    const harness = createHarness();
    const firstOpen = harness.openFirstChallenge();
    const usedCardIds = firstOpen.challenge.cards.map(({ cardId }) => cardId);
    harness.disconnect(aliceId);
    harness.disconnect(bobId);
    harness.elapse(3);

    harness.reconnect(aliceId);
    expect(requireState(harness.room).status).toBe("paused");
    harness.elapse(3);
    harness.reconnect(bobId);
    const countdown = requireState(harness.room);
    expect(countdown.status).toBe("countdown");
    expect(countdown.nextCardIndex).toBe(2);

    harness.elapse(COUNTDOWN_MS);
    const nextOpen = requireOpenState(harness.room);
    expect(nextOpen.nextCardIndex).toBe(4);
    expect(
      nextOpen.challenge.cards.some(({ cardId }) =>
        usedCardIds.includes(cardId)
      )
    ).toBe(false);
  });

  it("restores and reshuffles the full deck with changed settings on rematch", () => {
    let rngCall = 0;
    const harness = createHarness({
      rng: () => ((rngCall++ * 37) % 101) / 101
    });
    const first = harness.start();
    const firstOrder = [...first.drawOrder];

    harness.room.phase = "waiting";
    harness.room.game.state = null;
    harness.room.game.settings = { targetScore: 10 };
    const second = harness.start();

    expect(second.matchId).toBe("m2");
    expect(second.targetScore).toBe(10);
    expect(second.scores).toEqual({ [aliceId]: 0, [bobId]: 0 });
    expect(second.drawOrder).toHaveLength(56);
    expect(new Set([...second.drawOrder, second.setAsideCardId]).size).toBe(57);
    expect(second.drawOrder).not.toEqual(firstOrder);
  });
});
