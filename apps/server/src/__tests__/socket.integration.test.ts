import {
  type ClientToServerEvents,
  type CommandResult,
  type CreateRoomInput,
  type CreateRoomResult,
  type GameActionInput,
  type JoinRoomInput,
  type PublicRoomState,
  type RoomCommandInput,
  type RoomStateResult,
  type SendChatMessageInput,
  type SendChatMessageResult,
  type ServerToClientEvents
} from "@multiplayer-blueprint/shared";
import { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as createClient, type Socket as ClientSocket } from "socket.io-client";
import { createApplication, type ApplicationInstance } from "../app.js";
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
    }, 3000);

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

function waitForState(
  client: TestClient,
  predicate: (state: PublicRoomState) => boolean
): Promise<PublicRoomState> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for room state."));
    }, 3000);

    const cleanup = () => {
      clearTimeout(timeout);
      client.off("room:state", handleState);
    };

    const handleState = (state: PublicRoomState) => {
      if (predicate(state)) {
        cleanup();
        resolve(state);
      }
    };

    client.on("room:state", handleState);
  });
}

function createRoom(
  client: TestClient,
  input: CreateRoomInput
): Promise<CommandResult<CreateRoomResult>> {
  return new Promise((resolve) => client.emit("room:create", input, resolve));
}

function joinRoom(
  client: TestClient,
  input: JoinRoomInput
): Promise<CommandResult<RoomStateResult>> {
  return new Promise((resolve) => client.emit("room:join", input, resolve));
}

function startRoom(
  client: TestClient,
  input: RoomCommandInput
): Promise<CommandResult<RoomStateResult>> {
  return new Promise((resolve) => client.emit("room:start", input, resolve));
}

function sendChat(
  client: TestClient,
  input: SendChatMessageInput
): Promise<CommandResult<SendChatMessageResult>> {
  return new Promise((resolve) =>
    client.emit("chat:send-message", input, resolve)
  );
}

function sendAction(
  client: TestClient,
  input: GameActionInput
): Promise<CommandResult<RoomStateResult>> {
  return new Promise((resolve) => client.emit("game:action", input, resolve));
}

beforeEach(async () => {
  application = createApplication({
    roomManager: new RoomManager({
      rng: () => 0,
      deckFactory: () => [2, 4, 6, 2]
    }),
    cleanupIntervalMs: 60_000,
    bustRevealMs: 20
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

describe("Socket.IO multiplayer flow", () => {
  it("creates, joins, chats, starts a CardBank game, acts, and reconnects", async () => {
    const alice = createTestClient();
    const bob = createTestClient();
    await Promise.all([waitForConnect(alice), waitForConnect(bob)]);

    const created = await createRoom(alice, {
      guestId: aliceId,
      displayName: "Alice",
      extraLivesEnabled: false
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error(created.error.message);
    }

    const roomCode = created.data.roomCode;
    const aliceLobbyPromise = waitForState(
      alice,
      (state) => state.players.length === 2
    );
    const bobLobbyPromise = waitForState(
      bob,
      (state) => state.players.length === 2
    );
    const joined = await joinRoom(bob, {
      roomCode,
      guestId: bobId,
      displayName: "Bob"
    });
    expect(joined.ok).toBe(true);

    const aliceLobby = await aliceLobbyPromise;
    const bobLobby = await bobLobbyPromise;
    expect(aliceLobby.version).toBe(bobLobby.version);
    expect(aliceLobby.players.map((player) => player.displayName)).toEqual([
      "Alice",
      "Bob"
    ]);

    const chatStatePromise = waitForState(
      bob,
      (state) => state.chatMessages.length === 1
    );
    const chat = await sendChat(alice, {
      roomCode,
      text: "ready?"
    });
    expect(chat.ok).toBe(true);

    const chatState = await chatStatePromise;
    expect(chatState.chatMessages[0]?.text).toBe("ready?");

    const playingStatePromise = waitForState(
      bob,
      (state) => state.gameState?.turnPhase === "awaiting-draw"
    );
    const started = await startRoom(alice, { roomCode });
    expect(started.ok).toBe(true);
    const playingState = await playingStatePromise;
    expect(playingState.phase).toBe("playing");
    expect(playingState.gameState?.currentPlayerId).toBe(aliceId);

    const bobEarlyDraw = await sendAction(bob, {
      roomCode,
      action: {
        type: "draw-card"
      }
    });
    expect(bobEarlyDraw.ok).toBe(false);

    const aliceDrawStatePromise = waitForState(
      bob,
      (state) => state.gameState?.turnPhase === "awaiting-decision"
    );
    const aliceDraw = await sendAction(alice, {
      roomCode,
      action: {
        type: "draw-card"
      }
    });
    expect(aliceDraw.ok).toBe(true);
    const aliceDrawState = await aliceDrawStatePromise;
    expect(
      aliceDrawState.gameState?.players.find(
        (player) => player.playerId === aliceId
      )?.activeCount
    ).toBe(1);

    const bobTurnStatePromise = waitForState(
      bob,
      (state) => state.gameState?.currentPlayerId === bobId
    );
    const stop = await sendAction(alice, {
      roomCode,
      action: {
        type: "stop-turn"
      }
    });
    expect(stop.ok).toBe(true);
    await bobTurnStatePromise;

    const disconnectedStatePromise = waitForState(
      alice,
      (state) =>
        state.players.find((player) => player.id === bobId)?.connected === false
    );
    bob.disconnect();
    const disconnectedState = await disconnectedStatePromise;
    expect(
      disconnectedState.players.find((player) => player.id === bobId)?.score
    ).toBeDefined();

    const bobReconnected = createTestClient();
    await waitForConnect(bobReconnected);
    const reconnectedStatePromise = waitForState(
      bobReconnected,
      (state) =>
        state.players.find((player) => player.id === bobId)?.connected === true
    );
    const rejoin = await joinRoom(bobReconnected, {
      roomCode,
      guestId: bobId,
      displayName: "Bob"
    });
    expect(rejoin.ok).toBe(true);

    const reconnectedState = await reconnectedStatePromise;
    expect(reconnectedState.chatMessages[0]?.text).toBe("ready?");
  });

  it("shows a busting card before automatically discarding and advancing", async () => {
    const alice = createTestClient();
    const bob = createTestClient();
    await Promise.all([waitForConnect(alice), waitForConnect(bob)]);

    const created = await createRoom(alice, {
      guestId: aliceId,
      displayName: "Alice",
      extraLivesEnabled: false
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error(created.error.message);
    }

    const roomCode = created.data.roomCode;
    const joined = await joinRoom(bob, {
      roomCode,
      guestId: bobId,
      displayName: "Bob"
    });
    expect(joined.ok).toBe(true);

    const started = await startRoom(alice, { roomCode });
    expect(started.ok).toBe(true);

    for (const action of [
      { type: "draw-card" as const },
      { type: "draw-card" as const },
      { type: "draw-card" as const }
    ]) {
      const result = await sendAction(alice, {
        roomCode,
        action
      });
      expect(result.ok).toBe(true);
    }

    const revealPromise = waitForState(
      bob,
      (state) => state.gameState?.turnPhase === "revealing-bust"
    );
    const resolvedPromise = waitForState(
      bob,
      (state) =>
        state.phase === "finished" &&
        state.gameState.discardCount === 4
    );
    const bustDraw = await sendAction(alice, {
      roomCode,
      action: {
        type: "draw-card"
      }
    });
    expect(bustDraw.ok).toBe(true);

    const revealState = await revealPromise;
    expect(revealState.gameState?.pendingBust).toEqual({
      playerId: aliceId,
      cardValue: 2
    });
    expect(
      revealState.gameState?.players.find((player) => player.playerId === aliceId)
        ?.activeCount
    ).toBe(4);

    const resolvedState = await resolvedPromise;
    expect(
      resolvedState.gameState?.players.find(
        (player) => player.playerId === aliceId
      )?.activeCount
    ).toBe(0);
  });
});
