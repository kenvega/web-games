import {
  CARD_BANK_GAME_ID,
  CHAT_MESSAGE_MAX_LENGTH,
  MAX_CHAT_MESSAGES,
  type CommandResult
} from "@multiplayer-blueprint/shared";
import { describe, expect, it, vi } from "vitest";
import { createGameRegistry } from "../game/gameRegistry.js";
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

function createManager(nowValue = 1000) {
  let now = nowValue;
  const gameRegistry = createGameRegistry({
    [CARD_BANK_GAME_ID]: {
      rng: () => 0
    }
  });
  const manager = new RoomManager({
    now: () => now,
    gameRegistry,
    codeFactory: () => "23456789AB"
  });

  return {
    cardBankModule: gameRegistry.get(CARD_BANK_GAME_ID),
    manager,
    setNow: (nextNow: number) => {
      now = nextNow;
    },
    getNow: () => now
  };
}

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
    const code = generateRoomCode(
      existingCodes,
      () => candidates.shift() ?? ""
    );

    expect(code).toBe("23456789AC");
  });
});

describe("RoomManager", () => {
  it("creates a room and makes the first player host", () => {
    const { manager } = createManager();
    const created = createRoom(manager);

    expect(created.roomCode).toBe("23456789AB");
    expect(created.state.gameId).toBe(CARD_BANK_GAME_ID);
    expect(created.state.hostPlayerId).toBe(aliceId);
    expect(created.state.players).toHaveLength(1);
    expect(created.state.players[0]?.displayName).toBe("Alice");
    expect(created.state.players[0]).not.toHaveProperty("score");
    expect(created.state.phase).toBe("waiting");
    expect(created.state.game).toEqual({
      settings: {
        extraLivesEnabled: false
      },
      state: null
    });
    expect(created.state.version).toBe(1);
  });

  it("rejects unsupported game IDs", () => {
    const { manager } = createManager();

    const result = manager.createRoom({
      gameId: "unknown-game",
      guestId: aliceId,
      displayName: "Alice",
      socketId: "socket-a",
      settings: {
        extraLivesEnabled: false
      }
    });

    expectError(result, "INVALID_INPUT");
    expect(manager.getRoomCount()).toBe(0);
  });

  it("uses the selected game module to validate room settings", () => {
    const { manager } = createManager();

    const result = manager.createRoom({
      gameId: CARD_BANK_GAME_ID,
      guestId: aliceId,
      displayName: "Alice",
      socketId: "socket-a",
      settings: {
        extraLivesEnabled: "yes"
      }
    });

    expectError(result, "INVALID_INPUT");
    expect(manager.getRoomCount()).toBe(0);
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

  it("reports lifecycle commands used during the wrong room phase", () => {
    const { manager } = createManager();
    createRoom(manager);

    expectError(
      manager.restartRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      }),
      "INVALID_ROOM_PHASE"
    );
    expectError(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: {
          type: "anything"
        }
      }),
      "INVALID_ROOM_PHASE"
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

  it("enforces the selected module's maximum player count", () => {
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
  });

  it("notifies the game module only when a seated player reconnects", () => {
    const { cardBankModule, manager, setNow } = createManager();
    const handlePlayerConnected = vi.spyOn(
      cardBankModule,
      "handlePlayerConnected"
    );
    createRoom(manager);
    joinBob(manager);

    expect(handlePlayerConnected).not.toHaveBeenCalled();

    manager.disconnectSocket({
      roomCode: "23456789AB",
      guestId: bobId,
      socketId: "socket-b"
    });
    setNow(2_000);

    expectOk(
      manager.joinRoom({
        roomCode: "23456789AB",
        guestId: bobId,
        displayName: "Bob",
        socketId: "socket-b2"
      })
    );

    expect(handlePlayerConnected).toHaveBeenCalledOnce();
    expect(handlePlayerConnected).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: bobId,
        now: 2_000,
        room: expect.objectContaining({
          code: "23456789AB",
          players: expect.objectContaining({
            [bobId]: expect.objectContaining({
              connected: true,
              socketId: "socket-b2"
            })
          })
        })
      })
    );
  });

  it("does not treat duplicate-session replacement as a reconnect", () => {
    const { cardBankModule, manager } = createManager();
    const handlePlayerConnected = vi.spyOn(
      cardBankModule,
      "handlePlayerConnected"
    );
    createRoom(manager);
    joinBob(manager);

    const replacement = expectOk(
      manager.joinRoom({
        roomCode: "23456789AB",
        guestId: bobId,
        displayName: "Bob",
        socketId: "socket-b2"
      })
    );

    expect(replacement.previousSocketId).toBe("socket-b");
    expect(handlePlayerConnected).not.toHaveBeenCalled();
    expect(
      manager.disconnectSocket({
        roomCode: "23456789AB",
        guestId: bobId,
        socketId: "socket-b"
      })
    ).toBeNull();
    expect(
      manager
        .getPublicState("23456789AB")
        ?.players.find((player) => player.id === bobId)?.connected
    ).toBe(true);
  });

  it("notifies once when requestState reconnects and is then idempotent", () => {
    const { cardBankModule, manager, setNow } = createManager();
    const handlePlayerConnected = vi.spyOn(
      cardBankModule,
      "handlePlayerConnected"
    );
    createRoom(manager);
    manager.disconnectSocket({
      roomCode: "23456789AB",
      guestId: aliceId,
      socketId: "socket-a"
    });
    setNow(3_000);

    const reconnected = expectOk(
      manager.requestState({
        roomCode: "23456789AB",
        guestId: aliceId,
        socketId: "socket-a2"
      })
    );
    const repeated = expectOk(
      manager.requestState({
        roomCode: "23456789AB",
        guestId: aliceId,
        socketId: "socket-a2"
      })
    );

    expect(handlePlayerConnected).toHaveBeenCalledOnce();
    expect(handlePlayerConnected).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: aliceId,
        now: 3_000
      })
    );
    expect(repeated.state.version).toBe(reconnected.state.version);
  });

  it("commits game state returned by the reconnect hook", () => {
    const { cardBankModule, manager } = createManager();
    createRoom(manager);
    joinBob(manager);
    expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );
    manager.disconnectSocket({
      roomCode: "23456789AB",
      guestId: bobId,
      socketId: "socket-b"
    });
    vi.spyOn(cardBankModule, "handlePlayerConnected").mockImplementation(
      ({ room }) => {
        const state = room.game.state;
        return state === null
          ? null
          : {
              ...state,
              currentPlayerIndex: 1
            };
      }
    );

    const reconnected = expectOk(
      manager.joinRoom({
        roomCode: "23456789AB",
        guestId: bobId,
        displayName: "Bob",
        socketId: "socket-b2"
      })
    );

    expect(reconnected.state.game.state?.currentPlayerId).toBe(bobId);
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
});
