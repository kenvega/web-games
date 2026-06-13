import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { createSocket, type ClientSocket } from "../lib/socket.js";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

type SocketContextValue = {
  socket: ClientSocket;
  status: ConnectionStatus;
  ensureConnected: () => Promise<void>;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<ClientSocket | null>(null);
  if (socketRef.current === null) {
    socketRef.current = createSocket();
  }

  const socket = socketRef.current;
  const [status, setStatus] = useState<ConnectionStatus>(
    socket.connected ? "connected" : "connecting"
  );

  useEffect(() => {
    const handleConnect = () => setStatus("connected");
    const handleDisconnect = () => setStatus("disconnected");
    const handleConnectError = () => setStatus("disconnected");
    const handleReconnectAttempt = () => setStatus("reconnecting");

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
    };
  }, [socket]);

  const ensureConnected = useCallback(async () => {
    if (socket.connected) {
      return;
    }

    setStatus((currentStatus) =>
      currentStatus === "disconnected" ? "connecting" : currentStatus
    );

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("Socket connection timed out."));
      }, 8000);

      const cleanup = () => {
        window.clearTimeout(timeout);
        socket.off("connect", handleConnect);
        socket.off("connect_error", handleError);
      };

      const handleConnect = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        reject(new Error("Socket connection failed."));
      };

      socket.on("connect", handleConnect);
      socket.on("connect_error", handleError);
      socket.connect();
    });
  }, [socket]);

  const value = useMemo(
    () => ({
      socket,
      status,
      ensureConnected
    }),
    [ensureConnected, socket, status]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const value = useContext(SocketContext);
  if (value === null) {
    throw new Error("useSocket must be used inside SocketProvider.");
  }

  return value;
}
