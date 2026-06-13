import type { PublicPlayer } from "@multiplayer-blueprint/shared";
import { Crown, Users } from "lucide-react";

export function PlayerList({
  players,
  hostPlayerId,
  currentPlayerId
}: {
  players: PublicPlayer[];
  hostPlayerId: string;
  currentPlayerId: string;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
          <Users size={18} />
          Players
        </h2>
        <span className="text-sm text-slate-500">
          {players.filter((player) => player.connected).length}/{players.length}
        </span>
      </div>
      <ul className="grid gap-2">
        {players.map((player) => {
          const isHost = player.id === hostPlayerId;
          const isCurrentPlayer = player.id === currentPlayerId;

          return (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-950">
                    {player.displayName}
                    {isCurrentPlayer ? " (you)" : ""}
                  </span>
                  {isHost ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                      <Crown size={12} />
                      Host
                    </span>
                  ) : null}
                </div>
                <span
                  className={`text-xs ${
                    player.connected ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {player.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-800">
                {player.score}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
