import {
  type CommandResult,
  type CreateRoomInput,
  type CreateRoomResult,
  type GameActionInput,
  type JoinRoomInput,
  type RoomCommandInput,
  type RoomStateResult,
  type SendChatMessageInput,
  type SendChatMessageResult
} from "@multiplayer-blueprint/shared";
import type { ClientSocket } from "./socket.js";

const ACK_TIMEOUT_MS = 8000;

function timeoutResult<T>(message: string): CommandResult<T> {
  return {
    ok: false,
    error: {
      code: "UNEXPECTED_ERROR",
      message
    }
  };
}

function withTimeout<T>(
  executor: (resolve: (result: CommandResult<T>) => void) => void,
  timeoutMessage: string
): Promise<CommandResult<T>> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      resolve(timeoutResult(timeoutMessage));
    }, ACK_TIMEOUT_MS);

    executor((result) => {
      window.clearTimeout(timeout);
      resolve(result);
    });
  });
}

export function createRoomCommand(
  socket: ClientSocket,
  input: CreateRoomInput
): Promise<CommandResult<CreateRoomResult>> {
  return withTimeout(
    (resolve) => socket.emit("room:create", input, resolve),
    "The server did not respond while creating the room."
  );
}

export function joinRoomCommand(
  socket: ClientSocket,
  input: JoinRoomInput
): Promise<CommandResult<RoomStateResult>> {
  return withTimeout(
    (resolve) => socket.emit("room:join", input, resolve),
    "The server did not respond while joining the room."
  );
}

export function leaveRoomCommand(
  socket: ClientSocket,
  input: RoomCommandInput
): Promise<CommandResult<null>> {
  return withTimeout(
    (resolve) => socket.emit("room:leave", input, resolve),
    "The server did not respond while leaving the room."
  );
}

export function startRoomCommand(
  socket: ClientSocket,
  input: RoomCommandInput
): Promise<CommandResult<RoomStateResult>> {
  return withTimeout(
    (resolve) => socket.emit("room:start", input, resolve),
    "The server did not respond while starting the game."
  );
}

export function restartRoomCommand(
  socket: ClientSocket,
  input: RoomCommandInput
): Promise<CommandResult<RoomStateResult>> {
  return withTimeout(
    (resolve) => socket.emit("room:restart", input, resolve),
    "The server did not respond while restarting the room."
  );
}

export function requestRoomStateCommand(
  socket: ClientSocket,
  input: RoomCommandInput
): Promise<CommandResult<RoomStateResult>> {
  return withTimeout(
    (resolve) => socket.emit("room:request-state", input, resolve),
    "The server did not respond while refreshing the room."
  );
}

export function sendChatMessageCommand(
  socket: ClientSocket,
  input: SendChatMessageInput
): Promise<CommandResult<SendChatMessageResult>> {
  return withTimeout(
    (resolve) => socket.emit("chat:send-message", input, resolve),
    "The server did not respond while sending the message."
  );
}

export function sendGameActionCommand(
  socket: ClientSocket,
  input: GameActionInput
): Promise<CommandResult<RoomStateResult>> {
  return withTimeout(
    (resolve) => socket.emit("game:action", input, resolve),
    "The server did not respond while processing the action."
  );
}
