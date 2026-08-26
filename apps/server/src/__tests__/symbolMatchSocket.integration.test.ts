import {
  SYMBOL_MATCH_GAME_ID,
  type ClientToServerEvents,
  type CommandResult,
  type CreateRoomInput,
  type CreateRoomResult,
  type GameActionInput,
  type PublicSymbolMatchChallengeOpenState,
  type PublicSymbolMatchRoomState,
  type RoomCommandInput,
  type RoomStateResult,
  type SendChatMessageInput,
  type SendChatMessageResult,
  type ServerToClientEvents,
  type SymbolMatchCreateRoomInput,
  type SymbolMatchGameActionInput,
  type SymbolMatchUpdateRoomSettingsInput,
  type UpdateRoomSettingsInput
} from "@multiplayer-blueprint/shared";
import { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  io as createClient,
  type Socket as ClientSocket
} from "socket.io-client";
import { createApplication, type ApplicationInstance } from "../app.js";
import { createGameRegistry } from "../game/gameRegistry.js";
import { RoomManager } from "../rooms/roomManager.js";

const aliceId = "11111111-1111-4111-8111-111111111111";
const bobId = "22222222-2222-4222-8222-222222222222";

type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

let application: ApplicationInstance | null = null;
let serverUrl = "";
let clients: TestClient[] = [];

function createTestClient(): TestClient {
  const client: TestClient = createClient(serverUrl, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false
  });
  clients.push(client);
  return client;
}

function waitForConnect(client: TestClient): Promise<void> {
  if (client.connected) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Client did not connect."));
    }, 3_000);
    const cleanup = () => {
      clearTimeout(timeout);
      client.off("connect", handleConnect);
      client.off("connect_error", handleError);
    };
    const handleConnect = () => {
      cleanup();
      resolve();
    };
    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };
    client.on("connect", handleConnect);
    client.on("connect_error", handleError);
  });
}

function waitForSymbolState(
  client: TestClient,
  predicate: (state: PublicSymbolMatchRoomState) => boolean
): Promise<PublicSymbolMatchRoomState> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for Symbol Match room state."));
    }, 3_000);
    const cleanup = () => {
      clearTimeout(timeout);
      client.off("room:state", handleState);
    };
    const handleState: ServerToClientEvents["room:state"] = (state) => {
      const symbolState = state as unknown as PublicSymbolMatchRoomState;
      if (
        symbolState.gameId === SYMBOL_MATCH_GAME_ID &&
        predicate(symbolState)
      ) {
        cleanup();
        resolve(symbolState);
      }
    };
    client.on("room:state", handleState);
  });
}

function createSymbolRoom(
  client: TestClient,
  input: SymbolMatchCreateRoomInput
): Promise<CommandResult<CreateRoomResult>> {
  return new Promise((resolve) =>
    client.emit("room:create", input as unknown as CreateRoomInput, resolve)
  );
}

function joinRoom(
  client: TestClient,
  input: {
    roomCode: string;
    guestId: string;
    displayName: string;
  }
): Promise<CommandResult<RoomStateResult>> {
  return new Promise((resolve) => client.emit("room:join", input, resolve));
}

function startRoom(
  client: TestClient,
  input: RoomCommandInput
): Promise<CommandResult<RoomStateResult>> {
  return new Promise((resolve) => client.emit("room:start", input, resolve));
}

function restartRoom(
  client: TestClient,
  input: RoomCommandInput
): Promise<CommandResult<RoomStateResult>> {
  return new Promise((resolve) => client.emit("room:restart", input, resolve));
}

function updateSettings(
  client: TestClient,
  input: SymbolMatchUpdateRoomSettingsInput
): Promise<CommandResult<RoomStateResult>> {
  return new Promise((resolve) =>
    client.emit(
      "room:update-settings",
      input as unknown as UpdateRoomSettingsInput,
      resolve
    )
  );
}

function sendChat(
  client: TestClient,
  input: SendChatMessageInput
): Promise<CommandResult<SendChatMessageResult>> {
  return new Promise((resolve) =>
    client.emit("chat:send-message", input, resolve)
  );
}

function sendSymbolAction(
  client: TestClient,
  input: SymbolMatchGameActionInput
): Promise<CommandResult<RoomStateResult>> {
  return new Promise((resolve) =>
    client.emit("game:action", input as unknown as GameActionInput, resolve)
  );
}

function expectOk<T>(result: CommandResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.data;
}

function asSymbolState(
  data: RoomStateResult | CreateRoomResult
): PublicSymbolMatchRoomState {
  return data.state as unknown as PublicSymbolMatchRoomState;
}

function requireOpenState(state: PublicSymbolMatchRoomState) {
  const gameState = state.game.state;
  if (gameState?.status !== "challenge-open") {
    throw new Error("Expected an open Symbol Match challenge.");
  }
  return gameState;
}

function sharedSymbol(open: PublicSymbolMatchChallengeOpenState) {
  const [firstCard, secondCard] = open.challenge.cards;
  const secondSymbols = new Set(
    secondCard.printedSymbols.map(({ symbolId }) => symbolId)
  );
  const match = firstCard.printedSymbols.find(({ symbolId }) =>
    secondSymbols.has(symbolId)
  )?.symbolId;
  if (match === undefined) {
    throw new Error("Expected the public cards to share a symbol.");
  }
  return match;
}

function wrongSymbols(
  open: PublicSymbolMatchChallengeOpenState,
  playerId: string
) {
  const match = sharedSymbol(open);
  const card = open.challenge.cards.find(
    ({ assignedPlayerId }) => assignedPlayerId === playerId
  );
  if (card === undefined) {
    throw new Error(`Expected a card for ${playerId}.`);
  }
  return card.printedSymbols
    .map(({ symbolId }) => symbolId)
    .filter((symbolId) => symbolId !== match);
}

function points(state: PublicSymbolMatchRoomState, playerId: string): number {
  return (
    state.game.state?.scores.find((entry) => entry.playerId === playerId)
      ?.points ?? 0
  );
}

async function createJoinedStartedRoom() {
  const alice = createTestClient();
  const bob = createTestClient();
  await Promise.all([waitForConnect(alice), waitForConnect(bob)]);
  const created = expectOk(
    await createSymbolRoom(alice, {
      gameId: SYMBOL_MATCH_GAME_ID,
      guestId: aliceId,
      displayName: "Alice",
      settings: { targetScore: 5 }
    })
  );
  const roomCode = created.roomCode;
  expectOk(
    await joinRoom(bob, {
      roomCode,
      guestId: bobId,
      displayName: "Bob"
    })
  );
  const openPromise = waitForSymbolState(
    bob,
    (state) => state.game.state?.status === "challenge-open"
  );
  expectOk(await startRoom(alice, { roomCode }));
  const openState = await openPromise;
  return { alice, bob, openState, roomCode };
}

beforeEach(async () => {
  application = createApplication({
    roomManager: new RoomManager({
      enabledGameIds: [SYMBOL_MATCH_GAME_ID],
      gameRegistry: createGameRegistry({
        [SYMBOL_MATCH_GAME_ID]: {
          rng: () => 0,
          countdownMs: 15,
          wrongRepeatWindowMs: 5,
          wrongFeedbackMs: 10,
          correctFeedbackMs: 15,
          reconnectGraceMs: 50
        }
      })
    }),
    cleanupIntervalMs: 60_000
  });
  await new Promise<void>((resolve) => {
    application?.httpServer.listen(0, "127.0.0.1", resolve);
  });
  const address = application.httpServer.address() as AddressInfo;
  serverUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  for (const client of clients) {
    client.disconnect();
  }
  clients = [];
  if (application !== null) {
    await application.shutdown();
    application = null;
  }
});

describe("Symbol Match Socket.IO flow", () => {
  it("creates, joins, chats, starts, scores, pauses, reconnects, finishes, and rematches", async () => {
    const alice = createTestClient();
    const bob = createTestClient();
    await Promise.all([waitForConnect(alice), waitForConnect(bob)]);

    const created = expectOk(
      await createSymbolRoom(alice, {
        gameId: SYMBOL_MATCH_GAME_ID,
        guestId: aliceId,
        displayName: "Alice",
        settings: { targetScore: 5 }
      })
    );
    const roomCode = created.roomCode;
    expect(asSymbolState(created).game.settings.targetScore).toBe(5);

    const aliceLobbyPromise = waitForSymbolState(
      alice,
      (state) => state.players.length === 2
    );
    const bobLobbyPromise = waitForSymbolState(
      bob,
      (state) => state.players.length === 2
    );
    expectOk(
      await joinRoom(bob, {
        roomCode,
        guestId: bobId,
        displayName: "Bob"
      })
    );
    await Promise.all([aliceLobbyPromise, bobLobbyPromise]);

    const chatPromise = waitForSymbolState(
      bob,
      (state) => state.chatMessages.at(-1)?.text === "ready"
    );
    expectOk(await sendChat(alice, { roomCode, text: "ready" }));
    expect((await chatPromise).chatMessages.at(-1)?.displayName).toBe("Alice");

    const guestStart = await startRoom(bob, { roomCode });
    expect(guestStart).toMatchObject({
      ok: false,
      error: { code: "NOT_ROOM_HOST" }
    });

    const countdownPromise = waitForSymbolState(
      bob,
      (state) => state.game.state?.status === "countdown"
    );
    const firstOpenPromise = waitForSymbolState(
      bob,
      (state) => state.game.state?.status === "challenge-open"
    );
    expectOk(await startRoom(alice, { roomCode }));
    expect((await countdownPromise).phase).toBe("playing");
    const firstOpenRoom = await firstOpenPromise;
    const firstOpen = requireOpenState(firstOpenRoom);

    const wrongBroadcastPromise = waitForSymbolState(
      alice,
      (state) =>
        state.game.state?.status === "challenge-open" &&
        points(state, aliceId) === 1
    );
    expectOk(
      await sendSymbolAction(bob, {
        roomCode,
        action: {
          type: "select-symbol",
          challengeId: firstOpen.challenge.challengeId,
          symbolId: wrongSymbols(firstOpen, bobId)[0]!
        }
      })
    );
    expect(points(await wrongBroadcastPromise, aliceId)).toBe(1);

    const pausedPromise = waitForSymbolState(
      alice,
      (state) => state.game.state?.status === "paused"
    );
    bob.disconnect();
    const paused = await pausedPromise;
    expect(paused.game.state).toMatchObject({
      status: "paused",
      disconnectedPlayerIds: [bobId]
    });

    const reconnectedBob = createTestClient();
    await waitForConnect(reconnectedBob);
    const reconnectCountdownPromise = waitForSymbolState(
      alice,
      (state) => state.game.state?.status === "countdown"
    );
    const secondOpenPromise = waitForSymbolState(
      reconnectedBob,
      (state) => state.game.state?.status === "challenge-open"
    );
    expectOk(
      await joinRoom(reconnectedBob, {
        roomCode,
        guestId: bobId,
        displayName: "Bob"
      })
    );
    expect((await reconnectCountdownPromise).game.state?.status).toBe(
      "countdown"
    );
    const secondOpenRoom = await secondOpenPromise;
    const secondOpen = requireOpenState(secondOpenRoom);
    expect(secondOpen.challenge.cards.map(({ cardId }) => cardId)).not.toEqual(
      firstOpen.challenge.cards.map(({ cardId }) => cardId)
    );

    for (const symbolId of wrongSymbols(secondOpen, bobId).slice(0, 3)) {
      expectOk(
        await sendSymbolAction(reconnectedBob, {
          roomCode,
          action: {
            type: "select-symbol",
            challengeId: secondOpen.challenge.challengeId,
            symbolId
          }
        })
      );
    }

    const finishedPromise = waitForSymbolState(
      reconnectedBob,
      (state) => state.game.state?.status === "finished"
    );
    const correctResult = expectOk(
      await sendSymbolAction(alice, {
        roomCode,
        action: {
          type: "select-symbol",
          challengeId: secondOpen.challenge.challengeId,
          symbolId: sharedSymbol(secondOpen)
        }
      })
    );
    expect(asSymbolState(correctResult).game.state?.status).toBe(
      "challenge-feedback"
    );
    const finished = await finishedPromise;
    expect(finished.phase).toBe("finished");
    expect(finished.game.state).toMatchObject({
      status: "finished",
      result: {
        kind: "winner",
        winnerPlayerId: aliceId,
        reason: "target-score"
      }
    });

    const guestRestart = await restartRoom(reconnectedBob, { roomCode });
    expect(guestRestart).toMatchObject({
      ok: false,
      error: { code: "NOT_ROOM_HOST" }
    });
    const restarted = asSymbolState(
      expectOk(await restartRoom(alice, { roomCode }))
    );
    expect(restarted.phase).toBe("waiting");
    expect(restarted.game.state).toBeNull();

    const updated = asSymbolState(
      expectOk(
        await updateSettings(alice, {
          roomCode,
          gameId: SYMBOL_MATCH_GAME_ID,
          settings: { targetScore: 7 }
        })
      )
    );
    expect(updated.game.settings.targetScore).toBe(7);
    const rematch = asSymbolState(
      expectOk(await startRoom(alice, { roomCode }))
    );
    expect(rematch.game.state).toMatchObject({
      status: "countdown",
      targetScore: 7,
      scores: [
        { playerId: aliceId, points: 0 },
        { playerId: bobId, points: 0 }
      ]
    });
  });

  it("serializes nearly simultaneous actions according to server arrival order", async () => {
    const { alice, bob, openState, roomCode } = await createJoinedStartedRoom();
    const open = requireOpenState(openState);
    const feedbackPromise = waitForSymbolState(
      alice,
      (state) => state.game.state?.status === "challenge-feedback"
    );

    const wrongPromise = sendSymbolAction(bob, {
      roomCode,
      action: {
        type: "select-symbol",
        challengeId: open.challenge.challengeId,
        symbolId: wrongSymbols(open, bobId)[0]!
      }
    });
    const correctPromise = sendSymbolAction(alice, {
      roomCode,
      action: {
        type: "select-symbol",
        challengeId: open.challenge.challengeId,
        symbolId: sharedSymbol(open)
      }
    });
    const [wrongResult, correctResult] = await Promise.all([
      wrongPromise,
      correctPromise
    ]);
    expect(correctResult.ok).toBe(true);
    const feedback = await feedbackPromise;
    expect(feedback.game.state?.status).toBe("challenge-feedback");
    expect([1, 2]).toContain(points(feedback, aliceId));
    if (wrongResult.ok) {
      expect(points(feedback, aliceId)).toBe(2);
    } else {
      expect(wrongResult.error.code).toBe("INVALID_CHALLENGE_PHASE");
      expect(points(feedback, aliceId)).toBe(1);
    }
  });
});
