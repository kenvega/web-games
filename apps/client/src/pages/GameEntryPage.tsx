import { CARD_BANK_GAME_ID, gameIdSchema } from "@multiplayer-blueprint/shared";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { CardBankEntryPage } from "../game/card-bank/CardBankEntryPage.js";

export function GameEntryPage() {
  const { gameId: routeGameId } = useParams();
  const parsedGameId = gameIdSchema.safeParse(routeGameId ?? "");

  if (!parsedGameId.success) {
    return <UnavailableGame />;
  }

  switch (parsedGameId.data) {
    case CARD_BANK_GAME_ID:
      return <CardBankEntryPage />;
    default:
      return <UnavailableGame />;
  }
}

function UnavailableGame() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#041520] px-4 text-slate-100">
      <section className="grid max-w-md gap-4 rounded-md border border-cyan-200/15 bg-slate-950/55 p-5 text-center shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
        <h1 className="text-2xl font-bold text-white">Game unavailable</h1>
        <p className="text-sm leading-6 text-slate-400">
          This game is not supported by the current client.
        </p>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-300/50 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          to="/"
        >
          <ArrowLeft size={16} />
          Browse Games
        </Link>
      </section>
    </main>
  );
}
