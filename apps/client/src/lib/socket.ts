import {
  type ClientToServerEvents,
  type ServerToClientEvents
} from "@multiplayer-blueprint/shared";
import { io, type Socket } from "socket.io-client";

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(): ClientSocket {
  const socketUrl =
    import.meta.env.VITE_SOCKET_URL ??
    (import.meta.env.DEV ? "http://localhost:3000" : undefined);
  const options = {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    transports: ["websocket", "polling"]
  };

  return socketUrl === undefined ? io(options) : io(socketUrl, options);
}
