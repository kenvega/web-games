import {
  CARD_BANK_GAME_ID,
  type CardBankCardValue,
  type CommandResult,
  type RoomStateResult
} from "@multiplayer-blueprint/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGameRegistry } from "../gameRegistry.js";
import { RoomManager } from "../../rooms/roomManager.js";

const aliceId = "11111111-1111-4111-8111-111111111111";
const bobId = "22222222-2222-4222-8222-222222222222";

function expectOk<T>(result: CommandResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}

function expectError<T>(result: CommandResult<T>, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("Expected command to fail.");
  }

  expect(result.error.code).toBe(code);
}

function createManager(
  nowValue = 1000,
  deckFactory?: () => CardBankCardValue[],
  timerOptions: {
    bustRevealMs?: number;
    endingDelayMs?: number;
  } = {}
) {
  let now = nowValue;
  const manager = new RoomManager({
    now: () => now,
    gameRegistry: createGameRegistry({
      [CARD_BANK_GAME_ID]: {
        rng: () => 0,
        ...timerOptions,
        ...(deckFactory === undefined ? {} : { deckFactory })
      }
    }),
    codeFactory: () => "23456789AB"
  });

  return {
    manager,
    setNow: (nextNow: number) => {
      now = nextNow;
    },
    getNow: () => now
  };
}

afterEach(() => {
  vi.useRealTimers();
});

function createRoom(manager: RoomManager, extraLivesEnabled = false) {
  return expectOk(
    manager.createRoom({
      gameId: CARD_BANK_GAME_ID,
      guestId: aliceId,
      displayName: "Alice",
      socketId: "socket-a",
      settings: {
        extraLivesEnabled
      }
    })
  );
}

function joinBob(manager: RoomManager) {
  return expectOk(
    manager.joinRoom({
      roomCode: "23456789AB",
      guestId: bobId,
      displayName: "Bob",
      socketId: "socket-b"
    })
  );
}

describe("Card Banking through RoomManager", () => {
  it("starts a CardBank match with a full deck and a random first player", () => {
    const { manager } = createManager();
    createRoom(manager);
    joinBob(manager);

    const start = expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    expect(start.state.phase).toBe("playing");
    expect(start.state.game.state?.status).toBe("playing");
    expect(start.state.game.state?.turnPhase).toBe("awaiting-draw");
    expect(start.state.game.state?.deckCount).toBe(110);
    expect(start.state.game.state?.currentPlayerId).toBe(aliceId);
    expect(start.state.game.state?.players).toHaveLength(2);
  });

  it("draws one of four face-down cards and leaves the other choices in the deck", () => {
    const { manager } = createManager(1000, () => [2, 7, 4, 9]);
    createRoom(manager);
    joinBob(manager);
    const started = expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    expect(started.state.game.state?.drawChoiceCount).toBe(4);

    const pickedFourth = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card", choiceIndex: 3 }
      })
    );
    const alice = pickedFourth.state.game.state?.players.find(
      (player) => player.playerId === aliceId
    );

    expect(alice?.activeCards[9]).toBe(1);
    expect(alice?.activeCards[2]).toBe(0);
    expect(pickedFourth.state.game.state?.deckCount).toBe(3);
    expect(pickedFourth.state.game.state?.drawChoiceCount).toBe(3);

    expectError(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card", choiceIndex: 3 }
      }),
      "INVALID_GAME_ACTION"
    );

    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card", choiceIndex: 2 }
      })
    );
    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card", choiceIndex: 1 }
      })
    );
    const pickedRemaining = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card", choiceIndex: 0 }
      })
    );
    expect(pickedRemaining.state.game.state?.deckCount).toBe(0);
    expect(
      pickedRemaining.state.game.state?.players.find(
        (player) => player.playerId === aliceId
      )?.securedCardCount
    ).toBe(4);
  });

  it("uses the selected game module to validate game actions", () => {
    const { manager } = createManager();
    createRoom(manager);
    joinBob(manager);
    const started = expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    expectError(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card", choiceIndex: 4 }
      }),
      "INVALID_INPUT"
    );
    expect(manager.getPublicState("23456789AB")?.version).toBe(
      started.state.version
    );
  });

  it("keeps stopped cards stealable and resolves optional steals", () => {
    const { manager } = createManager(1000, () => [1, 1, 2]);
    createRoom(manager);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    let state = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: {
          type: "draw-card"
        }
      })
    );
    expect(state.state.game.state?.turnPhase).toBe("awaiting-decision");

    state = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: {
          type: "stop-turn"
        }
      })
    );
    expect(state.state.game.state?.currentPlayerId).toBe(bobId);
    expect(
      state.state.game.state?.players.find(
        (player) => player.playerId === aliceId
      )?.activeCount
    ).toBe(1);

    state = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: {
          type: "draw-card"
        }
      })
    );
    expect(state.state.game.state?.turnPhase).toBe("awaiting-steal");
    expect(state.state.game.state?.pendingSteal?.totalCount).toBe(1);

    state = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: {
          type: "resolve-steal",
          steal: true
        }
      })
    );
    expect(
      state.state.game.state?.players.find(
        (player) => player.playerId === aliceId
      )?.activeCount
    ).toBe(0);
    expect(
      state.state.game.state?.players.find(
        (player) => player.playerId === bobId
      )?.activeCount
    ).toBe(2);
  });

  it("hides secured point totals until the game finishes", () => {
    const { manager } = createManager(1000, () => [1, 2, 3, 4]);
    createRoom(manager);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    for (const [guestId, action] of [
      [aliceId, { type: "draw-card" as const }],
      [aliceId, { type: "stop-turn" as const }],
      [bobId, { type: "draw-card" as const }],
      [bobId, { type: "stop-turn" as const }]
    ] as const) {
      expectOk(
        manager.handleGameAction({
          roomCode: "23456789AB",
          guestId,
          action
        })
      );
    }

    const state = manager.getPublicState("23456789AB");
    expect(
      state?.game.state?.players.find((player) => player.playerId === aliceId)
        ?.securedCardCount
    ).toBe(1);
  });

  it("does not bust when a steal creates duplicates", () => {
    const { manager } = createManager(1000, () => [1, 1, 1, 5]);
    createRoom(manager);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card" }
      })
    );
    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card" }
      })
    );
    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "stop-turn" }
      })
    );
    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: { type: "draw-card" }
      })
    );
    const steal = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: { type: "resolve-steal", steal: true }
      })
    );
    expect(steal.state.game.state?.turnPhase).toBe("awaiting-decision");
    expect(steal.state.game.state?.pendingBust).toBeNull();
    expect(
      steal.state.game.state?.players.find(
        (player) => player.playerId === bobId
      )?.activeCards[1]
    ).toBe(3);
    expect(steal.state.game.state?.discardCount).toBe(0);
  });

  it("does not bust when drawing a duplicate as the third active card", () => {
    const { manager } = createManager(1000, () => [2, 3, 2, 5]);
    createRoom(manager);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    for (const action of [
      { type: "draw-card" as const },
      { type: "draw-card" as const },
      { type: "draw-card" as const }
    ]) {
      expectOk(
        manager.handleGameAction({
          roomCode: "23456789AB",
          guestId: aliceId,
          action
        })
      );
    }

    const state = manager.getPublicState("23456789AB");
    expect(state?.game.state?.currentPlayerId).toBe(aliceId);
    expect(state?.game.state?.turnPhase).toBe("awaiting-decision");
    expect(state?.game.state?.pendingBust).toBeNull();
    expect(state?.game.state?.discardCount).toBe(0);
    expect(
      state?.game.state?.players.find((player) => player.playerId === aliceId)
        ?.activeCount
    ).toBe(3);
  });

  it("resolves a bust after the game module's reveal delay", async () => {
    vi.useFakeTimers();
    const { manager } = createManager(1000, () => [2, 4, 6, 2, 5], {
      bustRevealMs: 20
    });
    const transitions: RoomStateResult[] = [];
    manager.onScheduledTransition((result) => transitions.push(result));
    createRoom(manager);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    for (const action of [
      { type: "draw-card" as const },
      { type: "draw-card" as const },
      { type: "draw-card" as const },
      { type: "draw-card" as const }
    ]) {
      expectOk(
        manager.handleGameAction({
          roomCode: "23456789AB",
          guestId: aliceId,
          action
        })
      );
    }

    const state = manager.getPublicState("23456789AB");
    expect(state?.game.state?.currentPlayerId).toBe(aliceId);
    expect(state?.game.state?.turnPhase).toBe("revealing-bust");
    expect(state?.game.state?.pendingBust).toEqual({
      playerId: aliceId,
      cardValue: 2
    });
    expect(state?.game.state?.discardCount).toBe(0);
    expect(
      state?.game.state?.players.find((player) => player.playerId === aliceId)
        ?.activeCount
    ).toBe(4);
    expectError(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "stop-turn" }
      }),
      "INVALID_TURN_PHASE"
    );
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(20);

    const resolved = manager.getPublicState("23456789AB");
    expect(vi.getTimerCount()).toBe(0);
    expect(transitions).toHaveLength(1);
    expect(resolved?.game.state?.currentPlayerId).toBe(bobId);
    expect(resolved?.game.state?.discardCount).toBe(4);
    expect(
      resolved?.game.state?.players.find(
        (player) => player.playerId === aliceId
      )?.activeCount
    ).toBe(0);
  });

  it("grants extra lives for each new run of three consecutive cards", () => {
    const { manager } = createManager(1000, () => [3, 4, 6, 7, 5, 10, 10, 10]);
    createRoom(manager, true);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    for (const action of [
      { type: "draw-card" as const },
      { type: "draw-card" as const },
      { type: "draw-card" as const },
      { type: "draw-card" as const }
    ]) {
      expectOk(
        manager.handleGameAction({
          roomCode: "23456789AB",
          guestId: aliceId,
          action
        })
      );
    }

    // After 3, 4, 6, 7 no run of three consecutive values exists yet.
    let alice = manager
      .getPublicState("23456789AB")
      ?.game.state?.players.find((player) => player.playerId === aliceId);
    expect(alice?.extraLives).toBe(0);

    // Drawing the 5 completes 3-4-5, 4-5-6 and 5-6-7 at once: three lives.
    const drewFive = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card" }
      })
    );
    expect(drewFive.state.game.state?.turnPhase).toBe("awaiting-decision");
    alice = drewFive.state.game.state?.players.find(
      (player) => player.playerId === aliceId
    );
    expect(alice?.extraLives).toBe(3);
  });

  it("spends an extra life to survive a bust instead of busting", () => {
    const { manager } = createManager(1000, () => [3, 4, 5, 3, 9, 9]);
    createRoom(manager, true);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    for (const action of [
      { type: "draw-card" as const },
      { type: "draw-card" as const },
      { type: "draw-card" as const }
    ]) {
      expectOk(
        manager.handleGameAction({
          roomCode: "23456789AB",
          guestId: aliceId,
          action
        })
      );
    }

    let alice = manager
      .getPublicState("23456789AB")
      ?.game.state?.players.find((player) => player.playerId === aliceId);
    expect(alice?.extraLives).toBe(1);

    // Drawing a duplicate 3 with three active cards would normally bust, but the
    // extra life shields the player: the card is kept like a normal draw and one
    // life is spent.
    const survived = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card" }
      })
    );
    expect(survived.state.game.state?.turnPhase).toBe("awaiting-decision");
    expect(survived.state.game.state?.pendingBust).toBeNull();
    expect(survived.state.game.state?.discardCount).toBe(0);
    alice = survived.state.game.state?.players.find(
      (player) => player.playerId === aliceId
    );
    expect(alice?.extraLives).toBe(0);
    expect(alice?.activeCount).toBe(4);
  });

  it("resets extra lives as soon as the player ends their turn", () => {
    const { manager } = createManager(1000, () => [3, 4, 5, 8, 8]);
    createRoom(manager, true);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    for (let draw = 0; draw < 3; draw += 1) {
      expectOk(
        manager.handleGameAction({
          roomCode: "23456789AB",
          guestId: aliceId,
          action: { type: "draw-card" }
        })
      );
    }

    let alice = manager
      .getPublicState("23456789AB")
      ?.game.state?.players.find((player) => player.playerId === aliceId);
    expect(alice?.extraLives).toBe(1);

    const stopped = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "stop-turn" }
      })
    );
    alice = stopped.state.game.state?.players.find(
      (player) => player.playerId === aliceId
    );
    expect(stopped.state.game.state?.currentPlayerId).toBe(bobId);
    expect(alice?.extraLives).toBe(0);
    expect(alice?.activeCount).toBe(3);
    expect(alice?.securedCardCount).toBe(0);

    // Ending the turn clears the life immediately, while the stopped cards
    // remain active until Alice's next turn begins and banks them.
    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: { type: "draw-card" }
      })
    );
    const backToAlice = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: { type: "stop-turn" }
      })
    );

    alice = backToAlice.state.game.state?.players.find(
      (player) => player.playerId === aliceId
    );
    expect(backToAlice.state.game.state?.currentPlayerId).toBe(aliceId);
    expect(alice?.extraLives).toBe(0);
    expect(alice?.activeCount).toBe(0);
    expect(alice?.securedCardCount).toBe(3);
  });

  it("does not grant extra lives when the rule is disabled", () => {
    const { manager } = createManager(1000, () => [3, 4, 5, 3, 9, 9]);
    createRoom(manager);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    for (const action of [
      { type: "draw-card" as const },
      { type: "draw-card" as const },
      { type: "draw-card" as const }
    ]) {
      expectOk(
        manager.handleGameAction({
          roomCode: "23456789AB",
          guestId: aliceId,
          action
        })
      );
    }

    // 3-4-5 would grant a life if the rule were on; with it off there is none.
    let alice = manager
      .getPublicState("23456789AB")
      ?.game.state?.players.find((player) => player.playerId === aliceId);
    expect(alice?.extraLives).toBe(0);

    // Drawing the duplicate 3 busts because there is no life to shield it.
    const busted = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card" }
      })
    );
    expect(busted.state.game.state?.turnPhase).toBe("revealing-bust");
    alice = busted.state.game.state?.players.find(
      (player) => player.playerId === aliceId
    );
    expect(alice?.extraLives).toBe(0);
  });

  it("lets the host toggle the extra-lives rule before a game starts", () => {
    const { manager } = createManager();
    const created = createRoom(manager);
    expect(created.state.game.settings.extraLivesEnabled).toBe(false);
    joinBob(manager);

    const enabled = expectOk(
      manager.updateRoomSettings({
        roomCode: "23456789AB",
        guestId: aliceId,
        gameId: CARD_BANK_GAME_ID,
        settings: {
          extraLivesEnabled: true
        }
      })
    );
    expect(enabled.state.game.settings.extraLivesEnabled).toBe(true);

    expectError(
      manager.updateRoomSettings({
        roomCode: "23456789AB",
        guestId: aliceId,
        gameId: CARD_BANK_GAME_ID,
        settings: {
          extraLivesEnabled: "yes"
        }
      }),
      "INVALID_INPUT"
    );
    expect(
      manager.getPublicState("23456789AB")?.game.settings.extraLivesEnabled
    ).toBe(true);

    // Non-host cannot change it.
    expectError(
      manager.updateRoomSettings({
        roomCode: "23456789AB",
        guestId: bobId,
        gameId: CARD_BANK_GAME_ID,
        settings: {
          extraLivesEnabled: false
        }
      }),
      "NOT_ROOM_HOST"
    );

    // It cannot be changed once a game is in progress.
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );
    expectError(
      manager.updateRoomSettings({
        roomCode: "23456789AB",
        guestId: aliceId,
        gameId: CARD_BANK_GAME_ID,
        settings: {
          extraLivesEnabled: false
        }
      }),
      "GAME_ALREADY_STARTED"
    );
  });

  it("resolves the last card before final scoring and tiebreaks", () => {
    const { manager } = createManager(1000, () => [1, 1, 2]);
    createRoom(manager);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card" }
      })
    );
    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "stop-turn" }
      })
    );
    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: { type: "draw-card" }
      })
    );
    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: { type: "resolve-steal", steal: true }
      })
    );
    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: { type: "stop-turn" }
      })
    );
    const finalState: RoomStateResult = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card" }
      })
    );

    expect(finalState.state.phase).toBe("finished");
    expect(finalState.state.game.state?.status).toBe("finished");
    expect(
      finalState.state.game.state?.finalStandings?.find(
        (standing) => standing.playerId === bobId
      )?.score
    ).toBe(2);
    expect(
      finalState.state.game.state?.finalStandings?.find(
        (standing) => standing.playerId === aliceId
      )?.score
    ).toBe(2);
    expect(
      finalState.state.game.state?.players.find(
        (player) => player.playerId === bobId
      )?.securedCardCount
    ).toBe(2);
    expect(
      finalState.state.game.state?.players.find(
        (player) => player.playerId === aliceId
      )?.securedCardCount
    ).toBe(1);
    expect(finalState.state.game.state?.winnerPlayerIds).toEqual([bobId]);
  });

  it("resolves a last-card steal after the game module's ending delay", async () => {
    vi.useFakeTimers();
    // Deck: [3, 3] — Alice draws 3, stops. Bob draws 3 (last card),
    // steal is offered because Alice has a 3. Bob steals, then the game
    // ends. Bob should have both cards (score 6), Alice should have 0.
    const { manager } = createManager(1000, () => [3, 3], {
      endingDelayMs: 20
    });
    createRoom(manager);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    // Alice draws 3 (deck: [3])
    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card" }
      })
    );
    // Alice stops — her 3 stays face-up and stealable
    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "stop-turn" }
      })
    );

    // Bob's turn: draws 3 (last card). Alice has an active 3, so steal
    // prompt appears even though the deck is now empty.
    const drawResult = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: { type: "draw-card" }
      })
    );
    expect(drawResult.state.game.state?.deckCount).toBe(0);
    expect(drawResult.state.game.state?.turnPhase).toBe("awaiting-steal");
    expect(drawResult.state.phase).toBe("playing");

    // Bob steals Alice's 3 — enters "ending" phase so the steal is
    // visible to clients before the game finishes.
    const stealResult = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: { type: "resolve-steal", steal: true }
      })
    );

    expect(stealResult.state.phase).toBe("playing");
    expect(stealResult.state.game.state?.turnPhase).toBe("ending");
    expect(stealResult.state.game.state?.status).toBe("playing");
    expect(vi.getTimerCount()).toBe(1);

    // Bob's active area should show the stolen cards (his 3 + Alice's 3)
    const bobActive = stealResult.state.game.state?.players.find(
      (player) => player.playerId === bobId
    );
    expect(bobActive?.activeCount).toBe(2);

    // Alice's active area should be empty (her 3 was stolen)
    const aliceActive = stealResult.state.game.state?.players.find(
      (player) => player.playerId === aliceId
    );
    expect(aliceActive?.activeCount).toBe(0);

    // The game module resolves the ending — the game finishes and cards bank.
    await vi.advanceTimersByTimeAsync(20);
    const finalState = manager.getPublicState("23456789AB");

    expect(vi.getTimerCount()).toBe(0);
    expect(finalState?.phase).toBe("finished");
    expect(finalState?.game.state?.status).toBe("finished");

    // Bob has both cards (two 3s = 6 points)
    const bobScore = finalState?.game.state?.finalStandings?.find(
      (standing) => standing.playerId === bobId
    )?.score;
    expect(bobScore).toBe(6);

    // Alice has 0 (her 3 was stolen)
    const aliceScore = finalState?.game.state?.finalStandings?.find(
      (standing) => standing.playerId === aliceId
    )?.score;
    expect(aliceScore).toBe(0);

    expect(finalState?.game.state?.winnerPlayerIds).toEqual([bobId]);
  });

  it("auto-stops a disconnected active player", () => {
    const { manager } = createManager(1000, () => [1, 2, 3]);
    createRoom(manager);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "draw-card" }
      })
    );

    const disconnected = manager.disconnectSocket({
      roomCode: "23456789AB",
      guestId: aliceId,
      socketId: "socket-a"
    });

    expect(disconnected?.game.state?.currentPlayerId).toBe(bobId);
    expect(
      disconnected?.game.state?.players.find(
        (player) => player.playerId === aliceId
      )?.activeCount
    ).toBe(1);
  });
});
