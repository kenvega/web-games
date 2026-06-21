import {
  displayNameSchema,
  gameActionInputSchema,
  guestIdSchema,
  joinRoomInputSchema,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type CardBankCardValue,
  roomCodeSchema,
  roomCommandInputSchema,
  sendChatMessageInputSchema,
  type CommandError,
  type CommandResult,
  type PublicRoomState,
  type RoomStateResult,
  type SendChatMessageResult
} from "@multiplayer-blueprint/shared";
import { createChatMessage, appendChatMessage } from "../chat/chatService.js";
import { CardBankGameModule } from "../game/card-bank/cardBankGame.js";
import { defaultRoomCodeFactory, generateRoomCode } from "./roomCodes.js";
import type { Player, Room } from "./types.js";

export const ABANDONED_ROOM_TTL_MS = 60 * 60 * 1000;

type Clock = () => number;

type RoomManagerOptions = {
  codeFactory?: () => string;
  now?: Clock;
  rng?: () => number;
  deckFactory?: () => CardBankCardValue[];
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

function ok<T>(data: T): CommandResult<T> {
  return {
    ok: true,
    data
  };
}

function fail(code: CommandError["code"], message: string): CommandResult<never> {
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
  private readonly gameModule: CardBankGameModule;

  constructor(options: RoomManagerOptions = {}) {
    this.codeFactory = options.codeFactory ?? defaultRoomCodeFactory;
    this.now = options.now ?? Date.now;
    this.gameModule = new CardBankGameModule({
      ...(options.rng === undefined ? {} : { rng: options.rng }),
      ...(options.deckFactory === undefined
        ? {}
        : { deckFactory: options.deckFactory })
    });
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

  createRoom(input: {
    guestId: string;
    displayName: string;
    socketId: string;
  }): CommandResult<{ roomCode: string; state: PublicRoomState }> {
    const guestIdResult = guestIdSchema.safeParse(input.guestId);
    const displayNameResult = displayNameSchema.safeParse(input.displayName);

    if (!guestIdResult.success || !displayNameResult.success) {
      return fail("INVALID_INPUT", "Enter a valid display name.");
    }

    const now = this.now();
    const code = generateRoomCode(new Set(this.rooms.keys()), this.codeFactory);
    const player: Player = {
      id: guestIdResult.data,
      displayName: displayNameResult.data,
      connected: true,
      score: 0,
      joinedAt: now,
      socketId: input.socketId
    };
    const room: Room = {
      code,
      hostPlayerId: player.id,
      phase: "waiting",
      players: {
        [player.id]: player
      },
      chatMessages: [],
      gameState: null,
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
        score: 0,
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

      for (const player of Object.values(room.players)) {
        player.score = 0;
      }

      room.phase = "playing";
      room.gameState = this.gameModule.start(room);
      this.syncPlayerScores(room);
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

    for (const player of Object.values(room.players)) {
      player.score = 0;
    }
    room.phase = "waiting";
    room.gameState = null;

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
      const issue = parsedInput.success
        ? null
        : parsedInput.error.issues.at(0);
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

    if (room.phase !== "playing" || room.gameState === null) {
      return fail("ROUND_NOT_ACTIVE", "There is no active game.");
    }

    const result = this.gameModule.handleAction({
      room,
      playerId: player.id,
      action: parsedInput.data.action,
      now: this.now()
    });

    if (!result.accepted) {
      return fail(result.errorCode, result.message);
    }

    room.gameState = result.nextState;
    if (result.nextState.status === "finished") {
      room.phase = "finished";
    }
    this.syncPlayerScores(room);

    return ok({
      state: this.commit(room)
    });
  }

  resolvePendingBust(roomCode: string): RoomStateResult | null {
    const parsedRoomCode = roomCodeSchema.safeParse(roomCode);
    if (!parsedRoomCode.success) {
      return null;
    }

    const room = this.rooms.get(parsedRoomCode.data);
    if (room === undefined || room.phase !== "playing") {
      return null;
    }

    const nextGameState = this.gameModule.resolvePendingBust(room);
    if (nextGameState === null) {
      return null;
    }

    room.gameState = nextGameState;
    if (nextGameState.status === "finished") {
      room.phase = "finished";
    }
    this.syncPlayerScores(room);

    return {
      state: this.commit(room)
    };
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
    const nextGameState = this.gameModule.handleDisconnectedActivePlayer(room);
    if (nextGameState !== null) {
      room.gameState = nextGameState;
      if (nextGameState.status === "finished") {
        room.phase = "finished";
      }
      this.syncPlayerScores(room);
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
      const nextGameState = this.gameModule.handleDisconnectedActivePlayer(room);
      if (nextGameState !== null) {
        room.gameState = nextGameState;
        if (nextGameState.status === "finished") {
          room.phase = "finished";
        }
        this.syncPlayerScores(room);
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
    this.gameModule.dispose();
    this.rooms.delete(roomCode);
  }

  private commit(room: Room): PublicRoomState {
    room.version += 1;
    room.updatedAt = this.now();
    return this.toPublicState(room);
  }

  private toPublicState(room: Room): PublicRoomState {
    return {
      code: room.code,
      phase: room.phase,
      hostPlayerId: room.hostPlayerId,
      players: Object.values(room.players)
        .sort((left, right) => left.joinedAt - right.joinedAt)
        .map((player) => ({
          id: player.id,
          displayName: player.displayName,
          connected: player.connected,
          score: room.phase === "finished" ? player.score : 0,
          joinedAt: player.joinedAt
        })),
      chatMessages: room.chatMessages,
      gameState:
        room.gameState === null
          ? null
          : this.gameModule.toPublicState(room.gameState),
      version: room.version
    };
  }

  private getConnectedPlayers(room: Room): Player[] {
    return Object.values(room.players).filter((player) => player.connected);
  }

  private syncPlayerScores(room: Room): void {
    if (room.gameState === null) {
      return;
    }

    const scores = this.gameModule.getPlayerScores(room.gameState);
    for (const player of Object.values(room.players)) {
      player.score = scores[player.id] ?? player.score;
    }
  }
}
