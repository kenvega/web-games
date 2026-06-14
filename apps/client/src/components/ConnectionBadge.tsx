import { Wifi, WifiOff } from "lucide-react";
import type { ConnectionStatus } from "../hooks/SocketProvider.js";

const labels: Record<ConnectionStatus, string> = {
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  disconnected: "Disconnected"
};

export function ConnectionBadge({
  status,
  tone = "light",
  className = ""
}: {
  status: ConnectionStatus;
  tone?: "light" | "dark";
  className?: string;
}) {
  const isConnected = status === "connected";
  const toneClass =
    tone === "dark"
      ? isConnected
        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.14)]"
        : "border-amber-300/40 bg-amber-500/10 text-amber-200"
      : isConnected
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${toneClass} ${className}`}
    >
      {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
      {labels[status]}
    </span>
  );
}
