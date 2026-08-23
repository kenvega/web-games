import { CARD_BANK_GAME_ID } from "@multiplayer-blueprint/shared";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/Button.js";
import { ConnectionBadge } from "../../components/ConnectionBadge.js";
import { RoomJoinForm } from "../../components/RoomJoinForm.js";
import { useCreateRoom } from "../../hooks/useCreateRoom.js";
import { useGuestDisplayName } from "../../hooks/useGuestDisplayName.js";

export function CardBankEntryPage() {
  const guestDisplayName = useGuestDisplayName();
  const { connectionStatus, createRoom, isCreating } = useCreateRoom();
  const [extraLivesEnabled, setExtraLivesEnabled] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    setFormError(null);
    const displayName = guestDisplayName.validateAndStore();
    if (displayName === null) {
      return;
    }

    const result = await createRoom({
      gameId: CARD_BANK_GAME_ID,
      guestId: guestDisplayName.guestId,
      displayName,
      settings: {
        extraLivesEnabled
      }
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
              <CardBankBrandMark />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                  Push-your-luck card game
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-normal text-white sm:text-4xl">
                  Card Banking
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

            <div className="grid gap-3 border-t border-cyan-200/15 pt-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  New Card Banking room
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  Choose the room rules, then invite another player.
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-cyan-200/15 bg-slate-950/40 p-3">
                <input
                  checked={extraLivesEnabled}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
                  onChange={(event) => {
                    setExtraLivesEnabled(event.target.checked);
                    setFormError(null);
                  }}
                  type="checkbox"
                />
                <span className="grid gap-0.5">
                  <span className="text-sm font-semibold text-slate-100">
                    Extra lives rule
                  </span>
                  <span className="text-xs leading-5 text-slate-400">
                    Collecting 3 consecutive cards (like 3-4-5) grants an extra
                    life that saves you from one bust.
                  </span>
                </span>
              </label>
              <Button
                className="!border-emerald-300/50 !bg-emerald-600 !text-white shadow-[0_0_24px_rgba(16,185,129,0.2)] hover:!bg-emerald-500 disabled:!border-slate-700 disabled:!bg-slate-800 disabled:!text-slate-500"
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

function CardBankBrandMark() {
  return (
    <div className="relative h-10 w-11 shrink-0">
      <div className="absolute left-0 top-1 h-9 w-6 rotate-[-10deg] rounded border-2 border-white bg-emerald-500 shadow-[0_8px_18px_rgba(0,0,0,0.28)]" />
      <div className="absolute right-0 top-0 h-10 w-7 rotate-[8deg] rounded border-2 border-white bg-cyan-500 shadow-[0_8px_18px_rgba(0,0,0,0.28)]" />
    </div>
  );
}
