import {
  displayNameSchema,
  roomCodeSchema,
  type GameAction,
  type GameActionInput,
  type GameId,
  type GameSettings,
  type PublicRoomState,
  type UpdateRoomSettingsInput
} from "@multiplayer-blueprint/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getGuestId,
  getStoredDisplayName,
  storeDisplayName
} from "../lib/guestIdentity.js";
import {
  joinRoomCommand,
  leaveRoomCommand,
  requestRoomStateCommand,
  restartRoomCommand,
  sendChatMessageCommand,
  sendGameActionCommand,
  startRoomCommand,
  updateRoomSettingsCommand
} from "../lib/socketCommands.js";
import { useSocket, type ConnectionStatus } from "./SocketProvider.js";

export type RoomSessionStatus = "joining" | "joined" | "not-found" | "error";

export type RoomSession = {
  roomCode: string | null;
  guestId: string;
  room: PublicRoomState | null;
  status: RoomSessionStatus;
  message: string | null;
  connectionStatus: ConnectionStatus;
  displayName: string;
  displayNameError: string | null;
  needsDisplayNameConfirmation: boolean;
  setDisplayName: (displayName: string) => void;
  join: (displayName: string) => Promise<void>;
  leave: () => Promise<void>;
  start: () => Promise<string | null>;
  restart: () => Promise<string | null>;
  updateSettings: <TGameId extends GameId>(
    gameId: TGameId,
    settings: GameSettings<TGameId>
  ) => Promise<string | null>;
  sendChatMessage: (text: string) => Promise<string | null>;
  sendGameAction: <TGameId extends GameId>(
    gameId: TGameId,
    action: GameAction<TGameId>
  ) => Promise<string | null>;
};

const missingRoomMessage =
  "This room no longer exists. Create a new room to continue.";
const invalidRoomMessage = "Enter a valid room code.";
const mismatchedGameMessage = "This command does not match the room's game.";

export function useRoomSession(routeRoomCode?: string): RoomSession {
  const { socket, status: connectionStatus, ensureConnected } = useSocket();
  const storedDisplayName = useMemo(() => getStoredDisplayName(), []);
  const [displayName, setDisplayName] = useState(storedDisplayName);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [needsDisplayNameConfirmation, setNeedsDisplayNameConfirmation] =
    useState(() => !displayNameSchema.safeParse(storedDisplayName).success);
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [status, setStatus] = useState<RoomSessionStatus>("joining");
  const [message, setMessage] = useState<string | null>(null);
  const joinedRef = useRef(false);
  const guestId = useMemo(() => getGuestId(), []);
  const parsedRoomCode = useMemo(
    () => roomCodeSchema.safeParse(routeRoomCode ?? ""),
    [routeRoomCode]
  );
  const roomCode = parsedRoomCode.success ? parsedRoomCode.data : null;

  const applyRoomState = useCallback(
    (nextRoom: PublicRoomState) => {
      if (roomCode === null || nextRoom.code !== roomCode) {
        return;
      }

      setRoom((currentRoom) => {
        if (currentRoom !== null && nextRoom.version < currentRoom.version) {
          return currentRoom;
        }

        return nextRoom;
      });
      setStatus("joined");
      setMessage(null);
    },
    [roomCode]
  );

  const join = useCallback(
    async (name: string) => {
      if (roomCode === null) {
        setStatus("not-found");
        setMessage(invalidRoomMessage);
        return;
      }

      const parsedName = displayNameSchema.safeParse(name);
      if (!parsedName.success) {
        setNeedsDisplayNameConfirmation(true);
        setDisplayNameError(
          parsedName.error.issues[0]?.message ?? "Enter a display name."
        );
        return;
      }

      setDisplayNameError(null);
      setStatus("joining");
      setMessage(null);

      try {
        const storedName = storeDisplayName(parsedName.data);
        setDisplayName(storedName);
        await ensureConnected();
        const result = await joinRoomCommand(socket, {
          roomCode,
          guestId,
          displayName: storedName
        });

        if (!result.ok) {
          joinedRef.current = false;
          if (result.error.code === "ROOM_NOT_FOUND") {
            setStatus("not-found");
            setMessage(missingRoomMessage);
            return;
          }

          setStatus("error");
          setMessage(result.error.message);
          return;
        }

        joinedRef.current = true;
        setNeedsDisplayNameConfirmation(false);
        applyRoomState(result.data.state);
      } catch {
        joinedRef.current = false;
        setStatus("error");
        setMessage("The server is still waking up or cannot be reached.");
      }
    },
    [applyRoomState, ensureConnected, guestId, roomCode, socket]
  );

  useEffect(() => {
    joinedRef.current = false;
    setRoom(null);
    setStatus(roomCode === null ? "not-found" : "joining");
    setMessage(roomCode === null ? invalidRoomMessage : null);
  }, [roomCode]);

  useEffect(() => {
    if (
      roomCode === null ||
      needsDisplayNameConfirmation ||
      joinedRef.current
    ) {
      return;
    }

    void join(displayName);
  }, [displayName, join, needsDisplayNameConfirmation, roomCode]);

  useEffect(() => {
    const handleState = (nextRoom: PublicRoomState) => applyRoomState(nextRoom);
    const handleClosed = (payload: { roomCode: string; message: string }) => {
      if (roomCode !== null && payload.roomCode === roomCode) {
        joinedRef.current = false;
        setRoom(null);
        setStatus("not-found");
        setMessage(payload.message);
      }
    };
    const handleSocketError = (payload: { message: string }) => {
      setMessage(payload.message);
    };

    socket.on("room:state", handleState);
    socket.on("room:closed", handleClosed);
    socket.on("room:error", handleSocketError);

    return () => {
      socket.off("room:state", handleState);
      socket.off("room:closed", handleClosed);
      socket.off("room:error", handleSocketError);
    };
  }, [applyRoomState, roomCode, socket]);

  useEffect(() => {
    if (
      connectionStatus !== "connected" ||
      roomCode === null ||
      !joinedRef.current
    ) {
      return;
    }

    void requestRoomStateCommand(socket, { roomCode }).then((result) => {
      if (result.ok) {
        applyRoomState(result.data.state);
        return;
      }

      if (result.error.code === "NOT_IN_ROOM") {
        void join(displayName);
        return;
      }

      if (result.error.code === "ROOM_NOT_FOUND") {
        setRoom(null);
        setStatus("not-found");
        setMessage(missingRoomMessage);
        return;
      }

      setMessage(result.error.message);
    });
  }, [applyRoomState, connectionStatus, displayName, join, roomCode, socket]);

  const leave = useCallback(async () => {
    if (roomCode !== null) {
      await leaveRoomCommand(socket, { roomCode });
    }
    joinedRef.current = false;
  }, [roomCode, socket]);

  const start = useCallback(async (): Promise<string | null> => {
    if (roomCode === null) {
      return invalidRoomMessage;
    }

    const result = await startRoomCommand(socket, { roomCode });
    if (!result.ok) {
      return result.error.message;
    }

    applyRoomState(result.data.state);
    return null;
  }, [applyRoomState, roomCode, socket]);

  const restart = useCallback(async (): Promise<string | null> => {
    if (roomCode === null) {
      return invalidRoomMessage;
    }

    const result = await restartRoomCommand(socket, { roomCode });
    if (!result.ok) {
      return result.error.message;
    }

    applyRoomState(result.data.state);
    return null;
  }, [applyRoomState, roomCode, socket]);

  const updateSettings = useCallback(
    async <TGameId extends GameId>(
      gameId: TGameId,
      settings: GameSettings<TGameId>
    ): Promise<string | null> => {
      if (roomCode === null || room === null) {
        return invalidRoomMessage;
      }
      if (room.gameId !== gameId) {
        return mismatchedGameMessage;
      }

      const commandInput = {
        roomCode,
        gameId,
        settings
      } as UpdateRoomSettingsInput;
      const result = await updateRoomSettingsCommand(socket, commandInput);
      if (!result.ok) {
        return result.error.message;
      }

      applyRoomState(result.data.state);
      return null;
    },
    [applyRoomState, room, roomCode, socket]
  );

  const sendChatMessage = useCallback(
    async (text: string): Promise<string | null> => {
      if (roomCode === null) {
        return invalidRoomMessage;
      }

      const result = await sendChatMessageCommand(socket, {
        roomCode,
        text
      });
      if (!result.ok) {
        return result.error.message;
      }

      applyRoomState(result.data.state);
      return null;
    },
    [applyRoomState, roomCode, socket]
  );

  const sendGameAction = useCallback(
    async <TGameId extends GameId>(
      gameId: TGameId,
      action: GameAction<TGameId>
    ): Promise<string | null> => {
      if (roomCode === null || room === null) {
        return invalidRoomMessage;
      }
      if (room.gameId !== gameId) {
        return mismatchedGameMessage;
      }

      const commandInput = {
        roomCode,
        action
      } as GameActionInput;
      const result = await sendGameActionCommand(socket, commandInput);
      if (!result.ok) {
        return result.error.message;
      }

      applyRoomState(result.data.state);
      return null;
    },
    [applyRoomState, room, roomCode, socket]
  );

  return {
    roomCode,
    guestId,
    room,
    status,
    message,
    connectionStatus,
    displayName,
    displayNameError,
    needsDisplayNameConfirmation,
    setDisplayName,
    join,
    leave,
    start,
    restart,
    updateSettings,
    sendChatMessage,
    sendGameAction
  };
}
