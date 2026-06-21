import type { PublicPlayer } from "@multiplayer-blueprint/shared";
import { Crown, Users } from "lucide-react";

export function PlayerList({
  players,
  hostPlayerId,
  currentPlayerId,
  securedCardCountByPlayerId
}: {
  players: PublicPlayer[];
  hostPlayerId: string;
  currentPlayerId: string;
  securedCardCountByPlayerId: Readonly<Record<string, number>>;
}) {
  const connectedCount = players.filter((player) => player.connected).length;

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-100">
          <Users size={18} />
          Players
        </h2>
        <span className="text-sm text-slate-400">
          {connectedCount}/{players.length}
        </span>
      </div>
      <ul className="grid gap-2">
        {players.map((player) => {
          const isHost = player.id === hostPlayerId;
          const isCurrentPlayer = player.id === currentPlayerId;

          return (
            <li
              key={player.id}
              className={`flex items-center justify-between gap-3 rounded-md border px-3 py-3 ${
                isCurrentPlayer
                  ? "border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_28px_rgba(16,185,129,0.2)]"
                  : "border-cyan-200/15 bg-slate-950/45"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-slate-100">
                    {player.displayName}
                    {isCurrentPlayer ? " (you)" : ""}
                  </span>
                  {isHost ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-xs font-semibold text-amber-200">
                      <Crown size={12} />
                      Host
                    </span>
                  ) : null}
                </div>
                <span className="mt-1 flex items-center gap-2 text-xs">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      player.connected ? "bg-emerald-400" : "bg-slate-500"
                    }`}
                  />
                  <span
                    className={
                      player.connected ? "text-emerald-300" : "text-slate-500"
                    }
                  >
                    {player.connected ? "Connected" : "Disconnected"}
                  </span>
                </span>
              </div>
              <div className="shrink-0 rounded-md border border-cyan-300/20 bg-slate-950/60 px-3 py-1 text-right">
                {/* <p className="text-[0.65rem] uppercase text-slate-400">
                  Cards Secured
                </p> */}
                <p className="text-lg font-bold leading-5 text-sky-300">
                  {securedCardCountByPlayerId[player.id] ?? 0}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
