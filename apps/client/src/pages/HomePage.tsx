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
        displayName: storedName
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
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen w-full max-w-5xl content-center gap-8 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Private browser rooms
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 sm:text-5xl">
              Multiplayer Blueprint
            </h1>
          </div>
          <ConnectionBadge status={status} />
        </header>

        <section className="grid gap-6 rounded-md border border-slate-200 bg-white p-4 shadow-panel sm:p-6">
          <form className="grid gap-5" onSubmit={handleJoinRoom}>
            <TextInput
              autoComplete="nickname"
              error={nameError}
              label="Display name"
              maxLength={24}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ada"
              value={displayName}
            />

            <div className="grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-[1fr_auto]">
              <TextInput
                autoComplete="off"
                error={roomCodeError}
                label="Room code"
                maxLength={10}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                placeholder="K7M2Q9PX4T"
                value={roomCode}
              />
              <div className="flex items-end">
                <Button
                  className="w-full sm:w-auto"
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

          <div className="grid gap-3 border-t border-slate-200 pt-5">
            <Button
              disabled={isSubmitting}
              icon={<Plus size={16} />}
              onClick={handleCreateRoom}
              type="button"
              variant="primary"
            >
              Create Room
            </Button>
            {formError !== null ? (
              <p className="text-sm font-medium text-rose-700">{formError}</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
