import {
  createRoomInputSchema,
  gameActionInputSchema,
  guestIdSchema,
  joinRoomInputSchema,
  MAX_PLAYERS,
  MIN_PLAYERS,
  roomCodeSchema,
  roomCommandInputSchema,
  sendChatMessageInputSchema,
  updateRoomSettingsInputSchema,
  type CommandError,
  type CommandResult,
  type PublicRoomState,
  type RoomStateResult,
  type SendChatMessageResult
} from "@multiplayer-blueprint/shared";
import { createChatMessage, appendChatMessage } from "../chat/chatService.js";
import { createGameRegistry, type GameRegistry } from "../game/gameRegistry.js";
import { defaultRoomCodeFactory, generateRoomCode } from "./roomCodes.js";
import type { Player, Room } from "./types.js";

export const ABANDONED_ROOM_TTL_MS = 60 * 60 * 1000;

type Clock = () => number;

type RoomManagerOptions = {
  codeFactory?: () => string;
  now?: Clock;
  gameRegistry?: GameRegistry;
};

type JoinRoomResult = {
  state: PublicRoomState;
  previousSocketId: string | null;
};

type LeaveRoomResult = {
  closedRoomCode: string | null;
  state: PublicRoomState | null;
  message: string | null;
};

type ScheduledTransitionListener = (result: RoomStateResult) => void;

function ok<T>(data: T): CommandResult<T> {
  return {
    ok: true,
    data
  };
}

function fail(
  code: CommandError["code"],
  message: string
): CommandResult<never> {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly codeFactory: () => string;
  private readonly now: Clock;
  private readonly gameRegistry: GameRegistry;
  private readonly scheduledTransitionListeners =
    new Set<ScheduledTransitionListener>();
  private stopped = false;

  constructor(options: RoomManagerOptions = {}) {
    this.codeFactory = options.codeFactory ?? defaultRoomCodeFactory;
    this.now = options.now ?? Date.now;
    this.gameRegistry = options.gameRegistry ?? createGameRegistry();
  }

  getRoom(code: string): Room | null {
    return this.rooms.get(code) ?? null;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getPublicState(code: string): PublicRoomState | null {
    const room = this.rooms.get(code);
    return room === undefined ? null : this.toPublicState(room);
  }

  onScheduledTransition(listener: ScheduledTransitionListener): () => void {
    this.scheduledTransitionListeners.add(listener);
    return () => {
      this.scheduledTransitionListeners.delete(listener);
    };
  }

  stop(): void {
    this.stopped = true;
    for (const room of this.rooms.values()) {
      this.getGameModule(room).dispose(room.code);
    }
    this.scheduledTransitionListeners.clear();
  }

  createRoom(input: {
    gameId: string;
    guestId: string;
    displayName: string;
    socketId: string;
    settings: unknown;
  }): CommandResult<{ roomCode: string; state: PublicRoomState }> {
    const parsedInput = createRoomInputSchema.safeParse(input);
    if (!parsedInput.success) {
      return fail(
        "INVALID_INPUT",
        "Select a valid game and enter a valid display name."
      );
    }

    const gameModule = this.gameRegistry.get(parsedInput.data.gameId);
    const settingsResult = gameModule.settingsSchema.safeParse(
      parsedInput.data.settings
    );
    if (!settingsResult.success) {
      return fail("INVALID_INPUT", "The game settings are invalid.");
    }

    const now = this.now();
    const code = generateRoomCode(new Set(this.rooms.keys()), this.codeFactory);
    const player: Player = {
      id: parsedInput.data.guestId,
      displayName: parsedInput.data.displayName,
      connected: true,
      joinedAt: now,
      socketId: input.socketId
    };
    const room: Room = {
      code,
      gameId: parsedInput.data.gameId,
      hostPlayerId: player.id,
      phase: "waiting",
      players: {
        [player.id]: player
      },
      chatMessages: [],
      game: {
        settings: settingsResult.data,
        state: null
      },
      version: 0,
      createdAt: now,
      updatedAt: now
    };

    this.rooms.set(code, room);
    const state = this.commit(room);

    return ok({
      roomCode: code,
      state
    });
  }

  joinRoom(input: {
    roomCode: string;
    guestId: string;
    displayName: string;
    socketId: string;
  }): CommandResult<JoinRoomResult> {
    const parsedInput = joinRoomInputSchema.safeParse(input);
    if (!parsedInput.success) {
      return fail("INVALID_INPUT", "Enter a valid room code and display name.");
    }

    const room = this.rooms.get(parsedInput.data.roomCode);
    if (room === undefined) {
      return fail(
        "ROOM_NOT_FOUND",
        "This room no longer exists. Create a new room to continue."
      );
    }

    const existingPlayer = room.players[parsedInput.data.guestId];
    if (existingPlayer === undefined && room.phase !== "waiting") {
      return fail("GAME_ALREADY_STARTED", "This game has already started.");
    }

    if (
      existingPlayer === undefined &&
      Object.keys(room.players).length >= MAX_PLAYERS
    ) {
      return fail("ROOM_FULL", "This room is full.");
    }

    let previousSocketId: string | null = null;

    if (existingPlayer !== undefined) {
      previousSocketId =
        existingPlayer.connected && existingPlayer.socketId !== input.socketId
          ? existingPlayer.socketId
          : null;
      existingPlayer.connected = true;
      existingPlayer.socketId = input.socketId;
      if (room.phase === "waiting") {
        existingPlayer.displayName = parsedInput.data.displayName;
      }
    } else {
      room.players[parsedInput.data.guestId] = {
        id: parsedInput.data.guestId,
        displayName: parsedInput.data.displayName,
        connected: true,
        joinedAt: this.now(),
        socketId: input.socketId
      };
    }

    const state = this.commit(room);
    return ok({
      state,
      previousSocketId
    });
  }

  requestState(input: {
    roomCode: string;
    guestId: string;
    socketId: string;
  }): CommandResult<RoomStateResult> {
    const roomCodeResult = roomCodeSchema.safeParse(input.roomCode);
    const guestIdResult = guestIdSchema.safeParse(input.guestId);
    if (!roomCodeResult.success || !guestIdResult.success) {
      return fail("INVALID_INPUT", "The room request is invalid.");
    }

    const room = this.rooms.get(roomCodeResult.data);
    if (room === undefined) {
      return fail(
        "ROOM_NOT_FOUND",
        "This room no longer exists. Create a new room to continue."
      );
    }

    const player = room.players[guestIdResult.data];
    if (player === undefined) {
      return fail("NOT_IN_ROOM", "You are not in this room.");
    }

    if (!player.connected || player.socketId !== input.socketId) {
      player.connected = true;
      player.socketId = input.socketId;
      return ok({
        state: this.commit(room)
      });
    }

    return ok({
      state: this.toPublicState(room)
    });
  }

  startRoom(input: {
    roomCode: string;
    guestId: string;
  }): CommandResult<RoomStateResult> {
    const parsedInput = roomCommandInputSchema.safeParse({
      roomCode: input.roomCode
    });
    const guestIdResult = guestIdSchema.safeParse(input.guestId);
    if (!parsedInput.success || !guestIdResult.success) {
      return fail("INVALID_INPUT", "The start request is invalid.");
    }

    const room = this.rooms.get(parsedInput.data.roomCode);
    if (room === undefined) {
      return fail(
        "ROOM_NOT_FOUND",
        "This room no longer exists. Create a new room to continue."
      );
    }

    const membershipError = this.validateHost(room, guestIdResult.data);
    if (membershipError !== null) {
      return fail(membershipError.code, membershipError.message);
    }

    if (room.phase === "waiting") {
      if (this.getConnectedPlayers(room).length < MIN_PLAYERS) {
        return fail(
          "NOT_ENOUGH_PLAYERS",
          `At least ${MIN_PLAYERS} connected players are required to start.`
        );
      }

      room.phase = "playing";
      room.game.state = this.getGameModule(room).start(room, this.now());
      return ok({
        state: this.commit(room)
      });
    }

    if (room.phase === "playing") {
      return fail("GAME_ALREADY_STARTED", "The game is already in progress.");
    }

    return fail(
      "GAME_ALREADY_STARTED",
      "Restart the match before starting another game."
    );
  }

  restartRoom(input: {
    roomCode: string;
    guestId: string;
  }): CommandResult<RoomStateResult> {
    const parsedInput = roomCommandInputSchema.safeParse({
      roomCode: input.roomCode
    });
    const guestIdResult = guestIdSchema.safeParse(input.guestId);
    if (!parsedInput.success || !guestIdResult.success) {
      return fail("INVALID_INPUT", "The restart request is invalid.");
    }

    const room = this.rooms.get(parsedInput.data.roomCode);
    if (room === undefined) {
      return fail(
        "ROOM_NOT_FOUND",
        "This room no longer exists. Create a new room to continue."
      );
    }

    const membershipError = this.validateHost(room, guestIdResult.data);
    if (membershipError !== null) {
      return fail(membershipError.code, membershipError.message);
    }

    if (room.phase !== "finished") {
      return fail("ROUND_NOT_ACTIVE", "The match is not finished yet.");
    }

    room.phase = "waiting";
    room.game.state = null;

    return ok({
      state: this.commit(room)
    });
  }

  updateRoomSettings(input: {
    roomCode: string;
    guestId: string;
    gameId: string;
    settings: unknown;
  }): CommandResult<RoomStateResult> {
    const parsedInput = updateRoomSettingsInputSchema.safeParse(input);
    const guestIdResult = guestIdSchema.safeParse(input.guestId);
    if (!parsedInput.success || !guestIdResult.success) {
      return fail("INVALID_INPUT", "The settings request is invalid.");
    }

    const room = this.rooms.get(parsedInput.data.roomCode);
    if (room === undefined) {
      return fail(
        "ROOM_NOT_FOUND",
        "This room no longer exists. Create a new room to continue."
      );
    }

    if (room.gameId !== parsedInput.data.gameId) {
      return fail("INVALID_INPUT", "The settings do not match this game.");
    }

    const settingsResult = this.getGameModule(room).settingsSchema.safeParse(
      parsedInput.data.settings
    );
    if (!settingsResult.success) {
      return fail("INVALID_INPUT", "The game settings are invalid.");
    }

    const membershipError = this.validateHost(room, guestIdResult.data);
    if (membershipError !== null) {
      return fail(membershipError.code, membershipError.message);
    }

    if (room.phase === "playing") {
      return fail(
        "GAME_ALREADY_STARTED",
        "You cannot change the rules during a game."
      );
    }

    room.game.settings = settingsResult.data;

    return ok({
      state: this.commit(room)
    });
  }

  addChatMessage(input: {
    roomCode: string;
    guestId: string;
    text: string;
  }): CommandResult<SendChatMessageResult> {
    const parsedInput = sendChatMessageInputSchema.safeParse({
      roomCode: input.roomCode,
      text: input.text
    });
    const guestIdResult = guestIdSchema.safeParse(input.guestId);
    if (!parsedInput.success || !guestIdResult.success) {
      const issue = parsedInput.success ? null : parsedInput.error.issues.at(0);
      return fail(
        issue?.code === "too_big" ? "MESSAGE_TOO_LONG" : "INVALID_INPUT",
        issue?.message ?? "Enter a valid message."
      );
    }

    const room = this.rooms.get(parsedInput.data.roomCode);
    if (room === undefined) {
      return fail(
        "ROOM_NOT_FOUND",
        "This room no longer exists. Create a new room to continue."
      );
    }

    const player = room.players[guestIdResult.data];
    if (player === undefined) {
      return fail("NOT_IN_ROOM", "You are not in this room.");
    }

    const message = createChatMessage({
      playerId: player.id,
      displayName: player.displayName,
      text: parsedInput.data.text,
      now: this.now()
    });

    room.chatMessages = appendChatMessage(room.chatMessages, message);

    return ok({
      message,
      state: this.commit(room)
    });
  }

  handleGameAction(input: {
    roomCode: string;
    guestId: string;
    action: unknown;
  }): CommandResult<RoomStateResult> {
    const parsedInput = gameActionInputSchema.safeParse({
      roomCode: input.roomCode,
      action: input.action
    });
    const guestIdResult = guestIdSchema.safeParse(input.guestId);
    if (!parsedInput.success || !guestIdResult.success) {
      return fail("INVALID_INPUT", "The game action is invalid.");
    }

    const room = this.rooms.get(parsedInput.data.roomCode);
    if (room === undefined) {
      return fail(
        "ROOM_NOT_FOUND",
        "This room no longer exists. Create a new room to continue."
      );
    }

    const player = room.players[guestIdResult.data];
    if (player === undefined) {
      return fail("NOT_IN_ROOM", "You are not in this room.");
    }

    if (room.phase !== "playing" || room.game.state === null) {
      return fail("ROUND_NOT_ACTIVE", "There is no active game.");
    }

    const gameModule = this.getGameModule(room);
    const actionResult = gameModule.actionSchema.safeParse(
      parsedInput.data.action
    );
    if (!actionResult.success) {
      return fail("INVALID_INPUT", "The game action is invalid.");
    }

    const result = gameModule.handleAction({
      room,
      playerId: player.id,
      action: actionResult.data,
      now: this.now()
    });

    if (!result.accepted) {
      return fail(result.errorCode, result.message);
    }

    room.game.state = result.nextState;
    if (result.nextState.status === "finished") {
      room.phase = "finished";
    }
    return ok({
      state: this.commit(room)
    });
  }

  disconnectSocket(input: {
    roomCode: string;
    guestId: string;
    socketId: string;
  }): PublicRoomState | null {
    const room = this.rooms.get(input.roomCode);
    if (room === undefined) {
      return null;
    }

    const player = room.players[input.guestId];
    if (player === undefined || player.socketId !== input.socketId) {
      return null;
    }

    player.connected = false;
    player.socketId = null;
    const nextGameState =
      this.getGameModule(room).handleDisconnectedActivePlayer(room);
    if (nextGameState !== null) {
      room.game.state = nextGameState;
      if (nextGameState.status === "finished") {
        room.phase = "finished";
      }
    }

    return this.commit(room);
  }

  leaveRoom(input: { roomCode: string; guestId: string }): LeaveRoomResult {
    const parsedInput = roomCommandInputSchema.safeParse({
      roomCode: input.roomCode
    });
    const guestIdResult = guestIdSchema.safeParse(input.guestId);

    if (!parsedInput.success || !guestIdResult.success) {
      return {
        closedRoomCode: null,
        state: null,
        message: null
      };
    }

    const room = this.rooms.get(parsedInput.data.roomCode);
    if (room === undefined || room.players[guestIdResult.data] === undefined) {
      return {
        closedRoomCode: null,
        state: null,
        message: null
      };
    }

    const hostLeft = room.hostPlayerId === guestIdResult.data;
    const leavingPlayer = room.players[guestIdResult.data];
    if (leavingPlayer === undefined) {
      return {
        closedRoomCode: null,
        state: null,
        message: null
      };
    }

    if (!hostLeft && room.phase !== "waiting") {
      leavingPlayer.connected = false;
      leavingPlayer.socketId = null;
      const nextGameState =
        this.getGameModule(room).handleDisconnectedActivePlayer(room);
      if (nextGameState !== null) {
        room.game.state = nextGameState;
        if (nextGameState.status === "finished") {
          room.phase = "finished";
        }
      }

      return {
        closedRoomCode: null,
        state: this.commit(room),
        message: null
      };
    }

    delete room.players[guestIdResult.data];

    if (Object.keys(room.players).length === 0) {
      this.deleteRoom(room.code);
      return {
        closedRoomCode: room.code,
        state: null,
        message: "The room was closed."
      };
    }

    if (hostLeft) {
      this.deleteRoom(room.code);
      return {
        closedRoomCode: room.code,
        state: null,
        message: "The host left and the room was closed."
      };
    }

    return {
      closedRoomCode: null,
      state: this.commit(room),
      message: null
    };
  }

  cleanup(now: number = this.now()): string[] {
    const removedRoomCodes: string[] = [];

    for (const room of this.rooms.values()) {
      const hasConnectedPlayers = this.getConnectedPlayers(room).length > 0;
      const canExpire = room.phase === "waiting" || room.phase === "finished";
      if (
        canExpire &&
        !hasConnectedPlayers &&
        now - room.updatedAt >= ABANDONED_ROOM_TTL_MS
      ) {
        this.deleteRoom(room.code);
        removedRoomCodes.push(room.code);
      }
    }

    return removedRoomCodes;
  }

  private validateHost(
    room: Room,
    guestId: string
  ): { code: CommandError["code"]; message: string } | null {
    const player = room.players[guestId];
    if (player === undefined) {
      return {
        code: "NOT_IN_ROOM",
        message: "You are not in this room."
      };
    }

    if (room.hostPlayerId !== guestId) {
      return {
        code: "NOT_ROOM_HOST",
        message: "Only the host can do that."
      };
    }

    if (!player.connected) {
      return {
        code: "NOT_IN_ROOM",
        message: "The host is disconnected."
      };
    }

    return null;
  }

  private deleteRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room === undefined) {
      return;
    }

    this.getGameModule(room).dispose(roomCode);
    this.rooms.delete(roomCode);
  }

  private commit(room: Room): PublicRoomState {
    room.version += 1;
    room.updatedAt = this.now();
    const state = this.toPublicState(room);
    this.syncScheduledTransition(room);
    return state;
  }

  private syncScheduledTransition(room: Room): void {
    if (this.stopped) {
      this.getGameModule(room).dispose(room.code);
      return;
    }

    this.getGameModule(room).syncScheduledTransition({
      room,
      onTransition: (nextState) => {
        if (this.rooms.get(room.code) !== room) {
          return;
        }

        room.game.state = nextState;
        if (nextState.status === "finished") {
          room.phase = "finished";
        }

        const result = {
          state: this.commit(room)
        };
        for (const listener of this.scheduledTransitionListeners) {
          listener(result);
        }
      }
    });
  }

  private toPublicState(room: Room): PublicRoomState {
    return {
      code: room.code,
      gameId: room.gameId,
      phase: room.phase,
      hostPlayerId: room.hostPlayerId,
      players: Object.values(room.players)
        .sort((left, right) => left.joinedAt - right.joinedAt)
        .map((player) => ({
          id: player.id,
          displayName: player.displayName,
          connected: player.connected,
          joinedAt: player.joinedAt
        })),
      chatMessages: room.chatMessages,
      game: {
        settings: room.game.settings,
        state:
          room.game.state === null
            ? null
            : this.getGameModule(room).toPublicState(room.game.state)
      },
      version: room.version
    };
  }

  private getConnectedPlayers(room: Room): Player[] {
    return Object.values(room.players).filter((player) => player.connected);
  }

  private getGameModule(room: Room) {
    return this.gameRegistry.get(room.gameId);
  }
}
