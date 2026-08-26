import {
  DEFAULT_SYMBOL_MATCH_TARGET_SCORE,
  SYMBOL_MATCH_GAME_ID,
  SYMBOL_MATCH_TARGET_SCORE_OPTIONS,
  type SymbolMatchTargetScore
} from "@multiplayer-blueprint/shared";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/Button.js";
import { ConnectionBadge } from "../../components/ConnectionBadge.js";
import { RoomJoinForm } from "../../components/RoomJoinForm.js";
import { useCreateRoom } from "../../hooks/useCreateRoom.js";
import { useGuestDisplayName } from "../../hooks/useGuestDisplayName.js";

export function SymbolMatchEntryPage() {
  const guestDisplayName = useGuestDisplayName();
  const { connectionStatus, createRoom, isCreating } = useCreateRoom();
  const [targetScore, setTargetScore] = useState<SymbolMatchTargetScore>(
    DEFAULT_SYMBOL_MATCH_TARGET_SCORE
  );
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    setFormError(null);
    const displayName = guestDisplayName.validateAndStore();
    if (displayName === null) {
      return;
    }

    const result = await createRoom({
      gameId: SYMBOL_MATCH_GAME_ID,
      guestId: guestDisplayName.guestId,
      displayName,
      settings: { targetScore }
    });
    setFormError(result);
  };

  return (
    <main className="min-h-screen bg-[#041520] text-slate-100">
      <div className="min-h-screen bg-[linear-gradient(180deg,#051723_0%,#062535_54%,#041520_100%)]">
        <div className="mx-auto grid min-h-screen w-full max-w-2xl content-center gap-6 px-4 py-8 sm:px-6">
          <Link
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
            to="/"
          >
            <ArrowLeft size={16} />
            All games
          </Link>

          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <SymbolMatchBrandMark />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
                  Fast visual matching
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-normal text-white sm:text-4xl">
                  Symbol Match
                </h1>
              </div>
            </div>
            <ConnectionBadge status={connectionStatus} tone="dark" />
          </header>

          <section className="grid gap-6 rounded-md border border-cyan-200/15 bg-slate-950/55 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.25)] sm:p-6">
            <RoomJoinForm
              disabled={isCreating}
              guestDisplayName={guestDisplayName}
            />

            <div className="grid gap-4 border-t border-cyan-200/15 pt-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  New Symbol Match room
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  Choose the winning score, then invite one friend.
                </p>
              </div>

              <fieldset className="grid gap-2">
                <legend className="text-sm font-semibold text-slate-100">
                  Points to win
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {SYMBOL_MATCH_TARGET_SCORE_OPTIONS.map((option) => (
                    <label
                      className={`grid min-h-11 cursor-pointer place-items-center rounded-md border px-3 py-2 text-sm font-bold transition ${
                        targetScore === option
                          ? "border-cyan-300/70 bg-cyan-500/20 text-cyan-100"
                          : "border-cyan-200/15 bg-slate-950/40 text-slate-300 hover:border-cyan-200/35"
                      }`}
                      key={option}
                    >
                      <input
                        checked={targetScore === option}
                        className="sr-only"
                        name="symbol-match-target-score"
                        onChange={() => {
                          setTargetScore(option);
                          setFormError(null);
                        }}
                        type="radio"
                        value={option}
                      />
                      {option}
                    </label>
                  ))}
                </div>
                <p className="text-xs leading-5 text-slate-400">
                  Correct matches give you a point. Mistakes give your opponent
                  a point.
                </p>
              </fieldset>

              <Button
                className="!border-cyan-300/60 !bg-cyan-600 !text-white shadow-[0_0_24px_rgba(8,145,178,0.25)] hover:!bg-cyan-500 disabled:!border-slate-700 disabled:!bg-slate-800 disabled:!text-slate-500"
                disabled={isCreating}
                icon={<Plus size={16} />}
                onClick={() => void handleCreateRoom()}
                type="button"
                variant="primary"
              >
                {isCreating ? "Creating Room…" : "Create Room"}
              </Button>
              {formError !== null ? (
                <p className="text-sm font-medium text-rose-300">{formError}</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function SymbolMatchBrandMark() {
  return (
    <div aria-hidden="true" className="relative h-12 w-12 shrink-0">
      <div className="absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-full border-[3px] border-[#171717] bg-white shadow-[3px_4px_0_#171717]">
        <span className="h-3 w-3 rounded-full bg-cyan-400" />
      </div>
      <div className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-[3px] border-[#171717] bg-white shadow-[3px_4px_0_#171717]">
        <span className="h-3 w-3 rotate-45 bg-amber-400" />
      </div>
    </div>
  );
}
