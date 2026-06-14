import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "./Button.js";

export function ShareButton({
  roomCode,
  tone = "light",
  className = ""
}: {
  roomCode: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const isDark = tone === "dark";

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
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Button
        type="button"
        variant="secondary"
        onClick={handleCopyInvite}
        icon={<Copy size={16} />}
        className={
          isDark
            ? "!border-cyan-300/20 !bg-slate-950/60 !text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:!bg-cyan-950/60"
            : ""
        }
      >
        Invite
      </Button>
      {message !== null ? (
        <span
          className={`inline-flex items-center gap-1 text-sm font-medium ${
            isDark ? "text-emerald-300" : "text-teal-800"
          }`}
        >
          {message === "Room link copied to clipboard" ? (
            <Check size={15} />
          ) : null}
          {message}
        </span>
      ) : null}
    </div>
  );
}
