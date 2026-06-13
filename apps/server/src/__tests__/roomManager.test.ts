import {
  CHAT_MESSAGE_MAX_LENGTH,
  MAX_CHAT_MESSAGES,
  type CommandResult,
  type RoomStateResult
} from "@multiplayer-blueprint/shared";
import { describe, expect, it } from "vitest";
import { ABANDONED_ROOM_TTL_MS, RoomManager } from "../rooms/roomManager.js";
import { generateRoomCode } from "../rooms/roomCodes.js";

const aliceId = "11111111-1111-4111-8111-111111111111";
const bobId = "22222222-2222-4222-8222-222222222222";
const carolId = "33333333-3333-4333-8333-333333333333";

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
  const manager = new RoomManager({
    now: () => now,
    startDelayMs: 3000,
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

  it("awards only the first valid reaction and ends the match at target score", () => {
    const { manager, setNow } = createManager();
    createRoom(manager);
    joinBob(manager);

    let start = expectOk(
      manager.startRoom({
        roomCode: "23456789AB",
        guestId: aliceId
      })
    );
    expect(start.state.phase).toBe("playing");

    expectError(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: {
          type: "claim-round"
        }
      }),
      "ROUND_NOT_ACTIVE"
    );

    setNow(start.state.gameState?.startsAt ?? 0);
    let claim: RoomStateResult = expectOk(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: aliceId,
        action: {
          type: "claim-round"
        }
      })
    );
    expect(claim.state.players.find((player) => player.id === aliceId)?.score).toBe(1);

    expectError(
      manager.handleGameAction({
        roomCode: "23456789AB",
        guestId: bobId,
        action: {
          type: "claim-round"
        }
      }),
      "ACTION_ALREADY_CLAIMED"
    );

    for (let round = 2; round <= 3; round += 1) {
      start = expectOk(
        manager.startRoom({
          roomCode: "23456789AB",
          guestId: aliceId
        })
      );
      setNow(start.state.gameState?.startsAt ?? 0);
      claim = expectOk(
        manager.handleGameAction({
          roomCode: "23456789AB",
          guestId: aliceId,
          action: {
            type: "claim-round"
          }
        })
      );
    }

    expect(claim.state.phase).toBe("finished");
    expect(claim.state.gameState?.status).toBe("match-finished");
    expect(claim.state.players.find((player) => player.id === aliceId)?.score).toBe(3);
  });
});
