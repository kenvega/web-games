import {
  type ClientToServerEvents,
  type CommandErrorCode,
  type CommandResult,
  type InterServerEvents,
  type RoomStateResult,
  type ServerToClientEvents,
  type SocketData
} from "@multiplayer-blueprint/shared";
import type { Server, Socket } from "socket.io";
import { RoomManager } from "../rooms/roomManager.js";

type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type SocketLifecycle = {
  stop: () => void;
};

type HandlerOptions = {
  cleanupIntervalMs?: number;
};

const DEFAULT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function ok<T>(data: T): CommandResult<T> {
  return {
    ok: true,
    data
  };
}

function fail(code: CommandErrorCode, message: string): CommandResult<never> {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

export function registerSocketHandlers(
  io: TypedServer,
  roomManager: RoomManager,
  options: HandlerOptions = {}
): SocketLifecycle {
  const emitState = (result: RoomStateResult): void => {
    io.to(result.state.code).emit("room:state", result.state);
  };

  const closeRoom = (roomCode: string, message: string): void => {
    io.to(roomCode).emit("room:closed", {
      roomCode,
      message
    });
  };

  const leaveCurrentRoom = (socket: TypedSocket): void => {
    const roomCode = socket.data.roomCode;
    const guestId = socket.data.guestId;
    if (roomCode === undefined || guestId === undefined) {
      return;
    }

    const result = roomManager.leaveRoom({
      roomCode,
      guestId
    });

    if (result.closedRoomCode !== null) {
      closeRoom(result.closedRoomCode, result.message ?? "The room was closed.");
    } else if (result.state !== null) {
      io.to(result.state.code).emit("room:state", result.state);
    }

    socket.leave(roomCode);
    delete socket.data.roomCode;
    delete socket.data.guestId;
  };

  const replacePreviousSocket = (
    previousSocketId: string | null,
    roomCode: string
  ): void => {
    if (previousSocketId === null) {
      return;
    }

    const previousSocket = io.sockets.sockets.get(previousSocketId);
    if (previousSocket === undefined) {
      return;
    }

    previousSocket.emit("room:error", {
      code: "PLAYER_ALREADY_CONNECTED",
      message: "This room was opened in another tab or device."
    });
    previousSocket.leave(roomCode);
    previousSocket.disconnect(true);
  };

  io.on("connection", (socket) => {
    socket.on("room:create", (input, ack) => {
      try {
        leaveCurrentRoom(socket);
        const result = roomManager.createRoom({
          guestId: input.guestId,
          displayName: input.displayName,
          socketId: socket.id
        });

        if (!result.ok) {
          ack(result);
          return;
        }

        socket.data.guestId = input.guestId;
        socket.data.roomCode = result.data.roomCode;
        socket.join(result.data.roomCode);
        ack(result);
        io.to(result.data.roomCode).emit("room:state", result.data.state);
      } catch (error) {
        console.error("room:create failed", error);
        ack(fail("UNEXPECTED_ERROR", "Unable to create the room."));
      }
    });

    socket.on("room:join", (input, ack) => {
      try {
        const requestedRoomCode = input.roomCode.trim().toUpperCase();
        if (
          socket.data.roomCode !== undefined &&
          socket.data.roomCode !== requestedRoomCode
        ) {
          leaveCurrentRoom(socket);
        }

        const result = roomManager.joinRoom({
          roomCode: input.roomCode,
          guestId: input.guestId,
          displayName: input.displayName,
          socketId: socket.id
        });

        if (!result.ok) {
          ack(result);
          return;
        }

        socket.data.guestId = input.guestId;
        socket.data.roomCode = requestedRoomCode;
        socket.join(requestedRoomCode);
        replacePreviousSocket(result.data.previousSocketId, requestedRoomCode);
        const stateResult = ok({
          state: result.data.state
        });
        ack(stateResult);
        emitState({
          state: result.data.state
        });
      } catch (error) {
        console.error("room:join failed", error);
        ack(fail("UNEXPECTED_ERROR", "Unable to join the room."));
      }
    });

    socket.on("room:leave", (input, ack) => {
      try {
        const guestId = socket.data.guestId;
        if (guestId === undefined) {
          ack(fail("NOT_IN_ROOM", "You are not in this room."));
          return;
        }

        const result = roomManager.leaveRoom({
          roomCode: input.roomCode,
          guestId
        });

        if (result.closedRoomCode !== null) {
          closeRoom(result.closedRoomCode, result.message ?? "The room was closed.");
        } else if (result.state !== null) {
          io.to(result.state.code).emit("room:state", result.state);
        }

        socket.leave(input.roomCode);
        delete socket.data.roomCode;
        delete socket.data.guestId;
        ack(ok(null));
      } catch (error) {
        console.error("room:leave failed", error);
        ack(fail("UNEXPECTED_ERROR", "Unable to leave the room."));
      }
    });

    socket.on("room:start", (input, ack) => {
      try {
        const guestId = socket.data.guestId;
        if (guestId === undefined) {
          ack(fail("NOT_IN_ROOM", "You are not in this room."));
          return;
        }

        const result = roomManager.startRoom({
          roomCode: input.roomCode,
          guestId
        });

        if (!result.ok) {
          ack(result);
          return;
        }

        ack(result);
        emitState(result.data);
      } catch (error) {
        console.error("room:start failed", error);
        ack(fail("UNEXPECTED_ERROR", "Unable to start the game."));
      }
    });

    socket.on("room:restart", (input, ack) => {
      try {
        const guestId = socket.data.guestId;
        if (guestId === undefined) {
          ack(fail("NOT_IN_ROOM", "You are not in this room."));
          return;
        }

        const result = roomManager.restartRoom({
          roomCode: input.roomCode,
          guestId
        });

        if (!result.ok) {
          ack(result);
          return;
        }

        ack(result);
        emitState(result.data);
      } catch (error) {
        console.error("room:restart failed", error);
        ack(fail("UNEXPECTED_ERROR", "Unable to restart the room."));
      }
    });

    socket.on("room:request-state", (input, ack) => {
      try {
        const guestId = socket.data.guestId;
        if (guestId === undefined) {
          ack(fail("NOT_IN_ROOM", "Join the room again to continue."));
          return;
        }

        const result = roomManager.requestState({
          roomCode: input.roomCode,
          guestId,
          socketId: socket.id
        });

        if (!result.ok) {
          ack(result);
          return;
        }

        socket.join(result.data.state.code);
        ack(result);
        emitState(result.data);
      } catch (error) {
        console.error("room:request-state failed", error);
        ack(fail("UNEXPECTED_ERROR", "Unable to refresh the room state."));
      }
    });

    socket.on("chat:send-message", (input, ack) => {
      try {
        const guestId = socket.data.guestId;
        if (guestId === undefined) {
          ack(fail("NOT_IN_ROOM", "You are not in this room."));
          return;
        }

        const result = roomManager.addChatMessage({
          roomCode: input.roomCode,
          guestId,
          text: input.text
        });

        if (!result.ok) {
          ack(result);
          return;
        }

        ack(result);
        io.to(result.data.state.code).emit("chat:message", result.data.message);
        io.to(result.data.state.code).emit("room:state", result.data.state);
      } catch (error) {
        console.error("chat:send-message failed", error);
        ack(fail("UNEXPECTED_ERROR", "Unable to send the message."));
      }
    });

    socket.on("game:action", (input, ack) => {
      try {
        const guestId = socket.data.guestId;
        if (guestId === undefined) {
          ack(fail("NOT_IN_ROOM", "You are not in this room."));
          return;
        }

        const result = roomManager.handleGameAction({
          roomCode: input.roomCode,
          guestId,
          action: input.action
        });

        if (!result.ok) {
          ack(result);
          return;
        }

        ack(result);
        emitState(result.data);
        io.to(result.data.state.code).emit("game:event", {
          roomCode: result.data.state.code,
          type:
            result.data.state.phase === "finished"
              ? "match-finished"
              : "game-updated"
        });
      } catch (error) {
        console.error("game:action failed", error);
        ack(fail("UNEXPECTED_ERROR", "Unable to process the game action."));
      }
    });

    socket.on("disconnect", () => {
      const roomCode = socket.data.roomCode;
      const guestId = socket.data.guestId;
      if (roomCode === undefined || guestId === undefined) {
        return;
      }

      const state = roomManager.disconnectSocket({
        roomCode,
        guestId,
        socketId: socket.id
      });

      if (state !== null) {
        io.to(roomCode).emit("room:state", state);
      }
    });
  });

  const cleanupTimer = setInterval(() => {
    const removedRoomCodes = roomManager.cleanup();
    for (const roomCode of removedRoomCodes) {
      closeRoom(
        roomCode,
        "This room no longer exists. Create a new room to continue."
      );
    }
  }, options.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.();

  return {
    stop: () => {
      clearInterval(cleanupTimer);
    }
  };
}
