import { displayNameSchema, roomCodeSchema } from "@multiplayer-blueprint/shared";
import { LogIn, Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button.js";
import { ConnectionBadge } from "../components/ConnectionBadge.js";
import { TextInput } from "../components/TextInput.js";
import { useSocket } from "../hooks/SocketProvider.js";
import { getGuestId, getStoredDisplayName, storeDisplayName } from "../lib/guestIdentity.js";
import { createRoomCommand } from "../lib/socketCommands.js";

export function HomePage() {
  const navigate = useNavigate();
  const { socket, status, ensureConnected } = useSocket();
  const [displayName, setDisplayName] = useState(getStoredDisplayName);
  const [extraLivesEnabled, setExtraLivesEnabled] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [roomCodeError, setRoomCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateAndStoreName = (): string | null => {
    const parsedName = displayNameSchema.safeParse(displayName);
    if (!parsedName.success) {
      setNameError(parsedName.error.issues[0]?.message ?? "Enter a display name.");
      return null;
    }

    setNameError(null);
    return storeDisplayName(parsedName.data);
  };

  const handleCreateRoom = async () => {
    const storedName = validateAndStoreName();
    if (storedName === null) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await ensureConnected();
      const result = await createRoomCommand(socket, {
        guestId: getGuestId(),
        displayName: storedName,
        extraLivesEnabled
      });

      if (!result.ok) {
        setFormError(result.error.message);
        return;
      }

      navigate(`/room/${result.data.roomCode}`);
    } catch {
      setFormError("The server is still waking up or cannot be reached.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const storedName = validateAndStoreName();
    const parsedRoomCode = roomCodeSchema.safeParse(roomCode);

    if (!parsedRoomCode.success) {
      setRoomCodeError(
        parsedRoomCode.error.issues[0]?.message ?? "Enter a valid room code."
      );
      return;
    }

    if (storedName === null) {
      return;
    }

    setRoomCodeError(null);
    navigate(`/room/${parsedRoomCode.data}`);
  };

  return (
    <main className="min-h-screen bg-[#041520] text-slate-100">
      <div className="min-h-screen bg-[linear-gradient(180deg,#051723_0%,#062535_54%,#041520_100%)]">
        <div className="mx-auto grid min-h-screen w-full max-w-2xl content-center gap-8 px-4 py-8 sm:px-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <BrandMark />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                  Private browser rooms
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-normal text-slate-100 sm:text-4xl">
                  Card Banking
                </h1>
              </div>
            </div>
            <ConnectionBadge status={status} tone="dark" />
          </header>

          <section className="grid gap-6 rounded-md border border-cyan-200/15 bg-slate-950/55 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.25)] sm:p-6">
            <form className="grid gap-5" onSubmit={handleJoinRoom}>
              <TextInput
                autoComplete="nickname"
                error={nameError}
                label="Display name"
                maxLength={24}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ada"
                tone="dark"
                value={displayName}
              />

              <div className="grid gap-3 border-t border-cyan-200/15 pt-5 sm:grid-cols-[1fr_auto]">
                <TextInput
                  autoComplete="off"
                  error={roomCodeError}
                  label="Room code"
                  maxLength={10}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  placeholder="K7M2Q9PX4T"
                  tone="dark"
                  value={roomCode}
                />
                <div className="flex items-end">
                  <Button
                    className="w-full !border-cyan-300/20 !bg-slate-950/45 !text-slate-100 hover:!bg-cyan-950/60 sm:w-auto"
                    disabled={isSubmitting}
                    icon={<LogIn size={16} />}
                    type="submit"
                    variant="secondary"
                  >
                    Join Room
                  </Button>
                </div>
              </div>
            </form>

            <div className="grid gap-3 border-t border-cyan-200/15 pt-5">
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-cyan-200/15 bg-slate-950/40 p-3">
                <input
                  checked={extraLivesEnabled}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
                  onChange={(event) =>
                    setExtraLivesEnabled(event.target.checked)
                  }
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
                disabled={isSubmitting}
                icon={<Plus size={16} />}
                onClick={handleCreateRoom}
                type="button"
                variant="primary"
                className="!border-emerald-300/50 !bg-emerald-600 !text-white shadow-[0_0_24px_rgba(16,185,129,0.2)] hover:!bg-emerald-500 disabled:!border-slate-700 disabled:!bg-slate-800 disabled:!text-slate-500"
              >
                Create Room
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

function BrandMark() {
  return (
    <div className="relative h-10 w-11 shrink-0">
      <div className="absolute left-0 top-1 h-9 w-6 rotate-[-10deg] rounded border-2 border-white bg-emerald-500 shadow-[0_8px_18px_rgba(0,0,0,0.28)]" />
      <div className="absolute right-0 top-0 h-10 w-7 rotate-[8deg] rounded border-2 border-white bg-cyan-500 shadow-[0_8px_18px_rgba(0,0,0,0.28)]" />
    </div>
  );
}
