import { CARD_BANK_GAME_ID } from "@multiplayer-blueprint/shared";
import { Play } from "lucide-react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/Button.js";
import { ConnectionBadge } from "../components/ConnectionBadge.js";
import { TextInput } from "../components/TextInput.js";
import { CardBankRoom } from "../game/card-bank/CardBankRoom.js";
import { useRoomSession } from "../hooks/useRoomSession.js";

export function RoomPage() {
  const { roomCode: routeRoomCode } = useParams();
  const navigate = useNavigate();
  const session = useRoomSession(routeRoomCode);

  const handleNameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void session.join(session.displayName);
  };

  const handleLeave = async () => {
    await session.leave();
    navigate("/");
  };

  if (session.roomCode === null) {
    return (
      <MissingRoom
        message="Enter a valid room code."
        onCreate={() => navigate("/")}
      />
    );
  }

  if (session.needsDisplayNameConfirmation && session.room === null) {
    return (
      <main className="min-h-screen bg-[#041520] px-4 py-8 text-slate-100">
        <section className="mx-auto grid max-w-md gap-5 rounded-md border border-cyan-200/15 bg-slate-950/55 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
              Room {session.roomCode}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-100">
              Choose a display name
            </h1>
          </div>
          <form className="grid gap-4" onSubmit={handleNameSubmit}>
            <TextInput
              autoComplete="nickname"
              error={session.displayNameError}
              label="Display name"
              maxLength={24}
              onChange={(event) => session.setDisplayName(event.target.value)}
              placeholder="Ada"
              tone="dark"
              value={session.displayName}
            />
            <Button icon={<Play size={16} />} type="submit" variant="primary">
              Join Room
            </Button>
          </form>
        </section>
      </main>
    );
  }

  if (session.status === "not-found") {
    return (
      <MissingRoom
        message={
          session.message ??
          "This room no longer exists. Create a new room to continue."
        }
        onCreate={() => navigate("/")}
      />
    );
  }

  if (session.room === null) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#041520] px-4 text-slate-100">
        <section className="grid max-w-md gap-4 rounded-md border border-cyan-200/15 bg-slate-950/55 p-5 text-center shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
          <ConnectionBadge status={session.connectionStatus} tone="dark" />
          <h1 className="text-2xl font-bold text-slate-100">Joining room</h1>
          <p className="text-sm leading-6 text-slate-400">
            {session.message ??
              "Waiting for the server to return the room state."}
          </p>
        </section>
      </main>
    );
  }

  switch (session.room.gameId) {
    case CARD_BANK_GAME_ID:
      return (
        <CardBankRoom
          connectionStatus={session.connectionStatus}
          currentPlayerId={session.guestId}
          message={session.message}
          onAction={(action) =>
            session.sendGameAction(CARD_BANK_GAME_ID, action)
          }
          onLeave={handleLeave}
          onRestart={session.restart}
          onSendChatMessage={session.sendChatMessage}
          onStart={session.start}
          onUpdateSettings={(settings) =>
            session.updateSettings(CARD_BANK_GAME_ID, settings)
          }
          room={session.room}
        />
      );
    default:
      return (
        <MissingRoom
          message="This game is not supported by this client."
          onCreate={() => navigate("/")}
        />
      );
  }
}

function MissingRoom({
  message,
  onCreate
}: {
  message: string;
  onCreate: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#041520] px-4 text-slate-100">
      <section className="grid max-w-md gap-4 rounded-md border border-cyan-200/15 bg-slate-950/55 p-5 text-center shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
        <h1 className="text-2xl font-bold text-slate-100">Room unavailable</h1>
        <p className="text-sm leading-6 text-slate-400">{message}</p>
        <Button onClick={onCreate} type="button" variant="primary">
          Browse Games
        </Button>
      </section>
    </main>
  );
}
