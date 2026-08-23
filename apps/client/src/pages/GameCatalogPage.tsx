import { Gamepad2, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { ConnectionBadge } from "../components/ConnectionBadge.js";
import { RoomJoinForm } from "../components/RoomJoinForm.js";
import { GAME_CATALOG } from "../game/gameCatalog.js";
import { useGuestDisplayName } from "../hooks/useGuestDisplayName.js";
import { useSocket } from "../hooks/SocketProvider.js";

export function GameCatalogPage() {
  const { status } = useSocket();
  const guestDisplayName = useGuestDisplayName();

  return (
    <main className="min-h-screen bg-[#041520] text-slate-100">
      <div className="min-h-screen bg-[linear-gradient(180deg,#051723_0%,#062535_54%,#041520_100%)]">
        <div className="mx-auto grid min-h-screen w-full max-w-5xl content-center gap-8 px-4 py-8 sm:px-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-cyan-200/20 bg-cyan-500/10 text-cyan-200 shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
                <Gamepad2 size={28} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                  Private browser rooms
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-normal text-slate-100 sm:text-4xl">
                  Web Games
                </h1>
              </div>
            </div>
            <ConnectionBadge status={status} tone="dark" />
          </header>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
            <section className="grid gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Game catalog
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  Choose a game
                </h2>
              </div>

              <div className="grid gap-4">
                {GAME_CATALOG.map((game) => (
                  <article
                    className="grid gap-5 rounded-md border border-cyan-200/15 bg-slate-950/55 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.25)]"
                    key={game.id}
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-cyan-200/20 bg-cyan-500/10 text-cyan-200">
                        <Gamepad2 size={25} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-extrabold text-white">
                          {game.title}
                        </h3>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                          {game.playerCount}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-slate-300">
                      {game.description}
                    </p>
                    <Link
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-300/50 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.2)] transition hover:bg-emerald-500"
                      to={game.path}
                    >
                      <Play size={16} />
                      Open Game
                    </Link>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-5 rounded-md border border-cyan-200/15 bg-slate-950/55 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.25)] sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Have an invitation?
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">
                  Join any room
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  The room code determines which game to open.
                </p>
              </div>
              <RoomJoinForm guestDisplayName={guestDisplayName} />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
