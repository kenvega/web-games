import { roomCodeSchema } from "@multiplayer-blueprint/shared";
import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { GuestDisplayNameController } from "../hooks/useGuestDisplayName.js";
import { Button } from "./Button.js";
import { TextInput } from "./TextInput.js";

export function RoomJoinForm({
  disabled = false,
  guestDisplayName
}: {
  disabled?: boolean;
  guestDisplayName: GuestDisplayNameController;
}) {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [roomCodeError, setRoomCodeError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const storedName = guestDisplayName.validateAndStore();
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
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <TextInput
        autoComplete="nickname"
        error={guestDisplayName.error}
        label="Display name"
        maxLength={24}
        onChange={(event) =>
          guestDisplayName.setDisplayName(event.target.value)
        }
        placeholder="Ada"
        tone="dark"
        value={guestDisplayName.displayName}
      />

      <div className="grid gap-3 border-t border-cyan-200/15 pt-5 sm:grid-cols-[1fr_auto]">
        <TextInput
          autoComplete="off"
          error={roomCodeError}
          label="Room code"
          maxLength={10}
          onChange={(event) => {
            setRoomCode(event.target.value.toUpperCase());
            setRoomCodeError(null);
          }}
          placeholder="K7M2Q9PX4T"
          tone="dark"
          value={roomCode}
        />
        <div className="flex items-end">
          <Button
            className="w-full !border-cyan-300/20 !bg-slate-950/45 !text-slate-100 hover:!bg-cyan-950/60 sm:w-auto"
            disabled={disabled}
            icon={<LogIn size={16} />}
            type="submit"
            variant="secondary"
          >
            Join Room
          </Button>
        </div>
      </div>
    </form>
  );
}
