import {
  CHAT_MESSAGE_MAX_LENGTH,
  MAX_CHAT_MESSAGES,
  type CardBankCardValue,
  type CommandResult,
  type RoomStateResult
} from "@multiplayer-blueprint/shared";
import { describe, expect, it } from "vitest";
import { ABANDONED_ROOM_TTL_MS, RoomManager } from "../rooms/roomManager.js";
import { generateRoomCode } from "../rooms/roomCodes.js";

const aliceId = "11111111-1111-4111-8111-111111111111";
const bobId = "22222222-2222-4222-8222-222222222222";
const carolId = "33333333-3333-4333-8333-333333333333";
const daveId = "44444444-4444-4444-8444-444444444444";
const erinId = "55555555-5555-4555-8555-555555555555";
const finnId = "66666666-6666-4666-8666-666666666666";
const ginaId = "77777777-7777-4777-8777-777777777777";

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
  deckFactory?: () => CardBankCardValue[]
) {
  let now = nowValue;
  const manager = new RoomManager({
    now: () => now,
    rng: () => 0,
    ...(deckFactory === undefined ? {} : { deckFactory }),
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

function createRoom(manager: RoomManager) {
  return expectOk(
    manager.createRoom({
      guestId: aliceId,
      displayName: "Alice",
      socketId: "socket-a"
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

function joinPlayer(
  manager: RoomManager,
  guestId: string,
  displayName: string,
  socketId: string
) {
  return expectOk(
    manager.joinRoom({
      roomCode: "23456789AB",
      guestId,
      displayName,
      socketId
    })
  );
}

describe("room codes", () => {
  it("generates a non-conflicting room code", () => {
    const existingCodes = new Set(["23456789AB"]);
    const candidates = ["23456789AB", "23456789AC"];
    const code = generateRoomCode(existingCodes, () => candidates.shift() ?? "");

    expect(code).toBe("23456789AC");
  });
});

describe("RoomManager", () => {
  it("creates a room and makes the first player host", () => {
    const { manager } = createManager();
    const created = createRoom(manager);

    expect(created.roomCode).toBe("23456789AB");
    expect(created.state.hostPlayerId).toBe(aliceId);
    expect(created.state.players).toHaveLength(1);
    expect(created.state.players[0]?.displayName).toBe("Alice");
    expect(created.state.phase).toBe("waiting");
    expect(created.state.version).toBe(1);
  });

  it("allows duplicate display names and rejects invalid names", () => {
    const { manager } = createManager();
    createRoom(manager);

    const duplicateName = manager.joinRoom({
      roomCode: "23456789AB",
      guestId: bobId,
      displayName: "Alice",
      socketId: "socket-b"
    });
    expectOk(duplicateName);

    const invalidName = manager.joinRoom({
      roomCode: "23456789AB",
      guestId: carolId,
      displayName: "",
      socketId: "socket-c"
    });
    expectError(invalidName, "INVALID_INPUT");
  });

  it("rejects starting with too few players and rejects non-host starts", () => {
    const { manager } = createManager();
    createRoom(manager);

    expectError(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      }),
      "NOT_ENOUGH_PLAYERS"
    );

    joinBob(manager);
    expectError(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: bobId
      }),
      "NOT_ROOM_HOST"
    );
  });

  it("rejects new joins once gameplay has started", () => {
    const { manager } = createManager();
    createRoom(manager);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );

    expectError(
      manager.joinRoom({
        roomCode: "23456789AB",
        guestId: carolId,
        displayName: "Carol",
        socketId: "socket-c"
      }),
      "GAME_ALREADY_STARTED"
    );
  });

  it("limits rooms to six players before the game starts", () => {
    const { manager } = createManager();
    createRoom(manager);
    joinBob(manager);
    joinPlayer(manager, carolId, "Carol", "socket-c");
    joinPlayer(manager, daveId, "Dave", "socket-d");
    joinPlayer(manager, erinId, "Erin", "socket-e");
    joinPlayer(manager, finnId, "Finn", "socket-f");

    expectError(
      manager.joinRoom({
        roomCode: "23456789AB",
        guestId: ginaId,
        displayName: "Gina",
        socketId: "socket-g"
      }),
      "ROOM_FULL"
    );
  });

  it("validates chat messages and retains only the latest messages", () => {
    const { manager } = createManager();
    createRoom(manager);

    expectError(
      manager.addChatMessage({
        roomCode: "23456789AB",
        guestId: aliceId,
        text: "x".repeat(CHAT_MESSAGE_MAX_LENGTH + 1)
      }),
      "MESSAGE_TOO_LONG"
    );

    for (let index = 0; index < MAX_CHAT_MESSAGES + 1; index += 1) {
      expectOk(
        manager.addChatMessage({
          roomCode: "23456789AB",
          guestId: aliceId,
          text: `message ${index}`
        })
      );
    }

    const state = manager.getPublicState("23456789AB");
    expect(state?.chatMessages).toHaveLength(MAX_CHAT_MESSAGES);
    expect(state?.chatMessages[0]?.text).toBe("message 1");
  });

  it("marks players disconnected and reconnects the same guest", () => {
    const { manager } = createManager();
    createRoom(manager);

    const disconnected = manager.disconnectSocket({
      roomCode: "23456789AB",
      guestId: aliceId,
      socketId: "socket-a"
    });

    expect(disconnected?.players[0]?.connected).toBe(false);

    const rejoined = expectOk(
      manager.joinRoom({
        roomCode: "23456789AB",
        guestId: aliceId,
        displayName: "Alice",
        socketId: "socket-a2"
      })
    );

    expect(rejoined.state.players[0]?.connected).toBe(true);
    expect(rejoined.state.players[0]?.score).toBe(0);
  });

  it("increments room versions for accepted mutations", () => {
    const { manager } = createManager();
    const created = createRoom(manager);
    const joined = joinBob(manager);
    const chat = expectOk(
      manager.addChatMessage({
        roomCode: "23456789AB",
        guestId: aliceId,
        text: "hello"
      })
    );

    expect(joined.state.version).toBeGreaterThan(created.state.version);
    expect(chat.state.version).toBeGreaterThan(joined.state.version);
  });

  it("expires abandoned waiting and finished rooms", () => {
    const { manager, getNow, setNow } = createManager();
    createRoom(manager);
    manager.disconnectSocket({
      roomCode: "23456789AB",
      guestId: aliceId,
      socketId: "socket-a"
    });

    setNow(getNow() + ABANDONED_ROOM_TTL_MS + 1);
    expect(manager.cleanup()).toEqual(["23456789AB"]);
    expect(manager.getRoomCount()).toBe(0);
  });

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
    expect(start.state.gameState?.status).toBe("playing");
    expect(start.state.gameState?.turnPhase).toBe("awaiting-draw");
    expect(start.state.gameState?.deckCount).toBe(110);
    expect(start.state.gameState?.currentPlayerId).toBe(aliceId);
    expect(start.state.gameState?.players).toHaveLength(2);
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
    expect(state.state.gameState?.turnPhase).toBe("awaiting-decision");

    state = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: {
          type: "stop-turn"
        }
      })
    );
    expect(state.state.gameState?.currentPlayerId).toBe(bobId);
    expect(
      state.state.gameState?.players.find((player) => player.playerId === aliceId)
        ?.activeCount
    ).toBe(1);
    expect(state.state.players.find((player) => player.id === aliceId)?.score).toBe(0);

    state = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: {
          type: "draw-card"
        }
      })
    );
    expect(state.state.gameState?.turnPhase).toBe("awaiting-steal");
    expect(state.state.gameState?.pendingSteal?.totalCount).toBe(1);

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
      state.state.gameState?.players.find((player) => player.playerId === aliceId)
        ?.activeCount
    ).toBe(0);
    expect(
      state.state.gameState?.players.find((player) => player.playerId === bobId)
        ?.activeCount
    ).toBe(2);
  });

  it("busts on the third active card when drawing a duplicate", () => {
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
    expect(state?.gameState?.currentPlayerId).toBe(aliceId);
    expect(state?.gameState?.turnPhase).toBe("revealing-bust");
    expect(state?.gameState?.pendingBust).toEqual({
      playerId: aliceId,
      cardValue: 2
    });
    expect(state?.gameState?.discardCount).toBe(0);
    expect(
      state?.gameState?.players.find((player) => player.playerId === aliceId)
        ?.activeCount
    ).toBe(3);
    expectError(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: { type: "stop-turn" }
      }),
      "INVALID_TURN_PHASE"
    );

    const resolved = manager.resolvePendingBust("23456789AB");
    expect(resolved?.state.gameState?.currentPlayerId).toBe(bobId);
    expect(resolved?.state.gameState?.discardCount).toBe(3);
    expect(
      resolved?.state.gameState?.players.find(
        (player) => player.playerId === aliceId
      )?.activeCount
    ).toBe(0);
    expect(resolved?.state.players.find((player) => player.id === aliceId)?.score).toBe(0);
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
    expect(finalState.state.gameState?.status).toBe("finished");
    expect(finalState.state.players.find((player) => player.id === bobId)?.score).toBe(2);
    expect(finalState.state.players.find((player) => player.id === aliceId)?.score).toBe(2);
    expect(finalState.state.gameState?.winnerPlayerIds).toEqual([bobId]);
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

    expect(disconnected?.gameState?.currentPlayerId).toBe(bobId);
    expect(
      disconnected?.gameState?.players.find((player) => player.playerId === aliceId)
        ?.activeCount
    ).toBe(1);
  });
});
