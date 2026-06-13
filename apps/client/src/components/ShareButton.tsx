import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "./Button.js";

export function ShareButton({ roomCode }: { roomCode: string }) {
  const [message, setMessage] = useState<string | null>(null);

  const handleCopyInvite = async () => {
    const inviteUrl = `${window.location.origin}/room/${roomCode}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage("Room link copied to clipboard");
    } catch {
      setMessage("Could not copy link");
    } finally {
      window.setTimeout(() => setMessage(null), 2200);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={handleCopyInvite}
        icon={<Copy size={16} />}
      >
        Invite
      </Button>
      {message !== null ? (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-teal-800">
          {message === "Room link copied to clipboard" ? (
            <Check size={15} />
          ) : null}
          {message}
        </span>
      ) : null}
    </div>
  );
}
