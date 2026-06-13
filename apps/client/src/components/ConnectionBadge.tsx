import { Wifi, WifiOff } from "lucide-react";
import type { ConnectionStatus } from "../hooks/SocketProvider.js";

const labels: Record<ConnectionStatus, string> = {
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  disconnected: "Disconnected"
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const isConnected = status === "connected";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
        isConnected
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
      {labels[status]}
    </span>
  );
}
