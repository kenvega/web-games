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

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

beforeEach(async () => {
  application = createApplication({
    roomManager: new RoomManager({
      startDelayMs: 50
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

describe("Socket.IO multiplayer flow", () => {
  it("creates, joins, chats, starts, resolves a reaction, and reconnects", async () => {
    const alice = createTestClient();
    const bob = createTestClient();
    await Promise.all([waitForConnect(alice), waitForConnect(bob)]);

    const created = await createRoom(alice, {
      guestId: aliceId,
      displayName: "Alice"
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

    const countdownStatePromise = waitForState(
      bob,
      (state) => state.gameState?.status === "countdown"
    );
    const started = await startRoom(alice, { roomCode });
    expect(started.ok).toBe(true);
    const countdownState = await countdownStatePromise;
    expect(countdownState.phase).toBe("playing");

    await delay(80);

    const [aliceClaim, bobClaim] = await Promise.all([
      sendAction(alice, {
        roomCode,
        action: {
          type: "claim-round"
        }
      }),
      sendAction(bob, {
        roomCode,
        action: {
          type: "claim-round"
        }
      })
    ]);

    const claimResults = [aliceClaim, bobClaim];
    expect(claimResults.filter((result) => result.ok)).toHaveLength(1);
    const winningState = claimResults.find(
      (result): result is CommandResult<RoomStateResult> & { ok: true } =>
        result.ok
    )?.data.state;
    expect(
      winningState?.players.reduce((total, player) => total + player.score, 0)
    ).toBe(1);

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
});
