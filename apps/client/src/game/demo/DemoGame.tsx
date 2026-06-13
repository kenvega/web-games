import type { PublicPlayer, PublicRoomState } from "@multiplayer-blueprint/shared";
import { Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/Button.js";

function formatSeconds(milliseconds: number): string {
  return Math.max(0, milliseconds / 1000).toFixed(1);
}

function getWinner(
  players: PublicPlayer[],
  winnerPlayerId: string | null
): PublicPlayer | null {
  if (winnerPlayerId === null) {
    return null;
  }

  return players.find((player) => player.id === winnerPlayerId) ?? null;
}

export function DemoGame({
  room,
  currentPlayerId,
  connected,
  onClaim
}: {
  room: PublicRoomState;
  currentPlayerId: string;
  connected: boolean;
  onClaim: () => Promise<string | null>;
}) {
  const [now, setNow] = useState(Date.now());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const gameState = room.gameState;

  useEffect(() => {
    if (gameState?.status !== "countdown") {
      setNow(Date.now());
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [gameState?.status, gameState?.startsAt]);

  const derivedStatus = useMemo(() => {
    if (
      gameState?.status === "countdown" &&
      gameState.startsAt !== null &&
      now >= gameState.startsAt
    ) {
      return "active";
    }

    return gameState?.status ?? null;
  }, [gameState, now]);

  const winner = getWinner(room.players, gameState?.winnerPlayerId ?? null);
  const canClaim =
    room.phase === "playing" &&
    derivedStatus === "active" &&
    gameState?.winnerPlayerId === null &&
    connected;
  const countdownMs =
    gameState?.startsAt === null || gameState?.startsAt === undefined
      ? 0
      : gameState.startsAt - now;

  const handleClaim = async () => {
    setIsClaiming(true);
    setFeedback(null);
    const result = await onClaim();
    setIsClaiming(false);
    setFeedback(result);
  };

  if (room.phase === "waiting") {
    return (
      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">
          First to React
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          The host can start when at least two connected players are in the room.
        </p>
      </section>
    );
  }

  if (gameState === null) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Game state is loading.
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            First to React
          </h2>
          <p className="text-sm text-slate-500">
            Round {gameState.roundNumber} · First to {gameState.targetScore}
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold capitalize text-slate-800">
          {derivedStatus?.replace("-", " ") ?? "Waiting"}
        </span>
      </div>

      {derivedStatus === "countdown" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-sm font-medium text-amber-900">Get ready</p>
          <p className="text-4xl font-bold text-amber-950">
            {formatSeconds(countdownMs)}
          </p>
        </div>
      ) : null}

      <Button
        className="min-h-28 text-lg"
        disabled={!canClaim || isClaiming}
        icon={<Zap size={22} />}
        onClick={handleClaim}
        type="button"
        variant={canClaim ? "primary" : "secondary"}
      >
        React
      </Button>

      {winner !== null ? (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900">
          {winner.id === currentPlayerId ? "You won the round." : `${winner.displayName} won the round.`}
        </p>
      ) : null}

      {room.phase === "finished" ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
          Match finished.
        </p>
      ) : null}

      {feedback !== null ? (
        <p className="text-sm font-medium text-rose-700">{feedback}</p>
      ) : null}
    </section>
  );
}
