import type { CreateRoomInput } from "@multiplayer-blueprint/shared";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoomCommand } from "../lib/socketCommands.js";
import { useSocket, type ConnectionStatus } from "./SocketProvider.js";

export type CreateRoomController = {
  connectionStatus: ConnectionStatus;
  isCreating: boolean;
  createRoom: (input: CreateRoomInput) => Promise<string | null>;
};

export function useCreateRoom(): CreateRoomController {
  const navigate = useNavigate();
  const { socket, status: connectionStatus, ensureConnected } = useSocket();
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = useCallback(
    async (input: CreateRoomInput): Promise<string | null> => {
      setIsCreating(true);

      try {
        await ensureConnected();
        const result = await createRoomCommand(socket, input);
        if (!result.ok) {
          return result.error.message;
        }

        navigate(`/room/${result.data.roomCode}`);
        return null;
      } catch {
        return "The server is still waking up or cannot be reached.";
      } finally {
        setIsCreating(false);
      }
    },
    [ensureConnected, navigate, socket]
  );

  return {
    connectionStatus,
    isCreating,
    createRoom
  };
}
