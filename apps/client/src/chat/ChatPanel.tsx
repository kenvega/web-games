import {
  CHAT_MESSAGE_MAX_LENGTH,
  type PublicChatMessage
} from "@multiplayer-blueprint/shared";
import { Send } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { Button } from "../components/Button.js";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit"
});

export function ChatPanel({
  messages,
  disabled,
  onSend,
  fill = false,
  className = ""
}: {
  messages: PublicChatMessage[];
  disabled: boolean;
  onSend: (text: string) => Promise<string | null>;
  fill?: boolean;
  className?: string;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const remainingCharacters = CHAT_MESSAGE_MAX_LENGTH - text.length;
  const renderedMessages = useMemo(() => messages.slice(-100), [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      setError("Enter a message.");
      return;
    }

    setIsSending(true);
    setError(null);
    const result = await onSend(trimmedText);
    setIsSending(false);

    if (result === null) {
      setText("");
    } else {
      setError(result);
    }

    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <section
      className={`grid gap-3 text-slate-100 ${
        fill ? "h-full min-h-0" : "min-h-[22rem]"
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase text-slate-100">
          Room Chat
        </h2>
        <span
          className={`text-xs ${
            remainingCharacters < 0 ? "text-rose-300" : "text-slate-400"
          }`}
        >
          {remainingCharacters}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-md border border-cyan-200/15 bg-slate-950/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="min-h-48 flex-1 overflow-y-auto pr-1">
          {renderedMessages.length === 0 ? (
            <p className="text-sm text-slate-400">No messages yet.</p>
          ) : (
            <ol className="grid gap-3">
              {renderedMessages.map((message) => (
                <li key={message.id} className="grid gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-100">
                      {message.displayName}
                    </span>
                    <time className="shrink-0 text-xs text-slate-500">
                      {timeFormatter.format(new Date(message.createdAt))}
                    </time>
                  </div>
                  <p className="rounded-md border border-cyan-200/10 bg-cyan-950/35 px-3 py-2 text-sm leading-6 text-slate-200">
                    {message.text}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
        <form className="grid gap-2" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              className="min-h-11 min-w-0 flex-1 rounded-md border border-cyan-200/20 bg-slate-950/70 px-3 py-2 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              disabled={disabled || isSending}
              maxLength={CHAT_MESSAGE_MAX_LENGTH + 20}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type a message..."
              ref={inputRef}
              value={text}
            />
            <Button
              aria-label="Send chat message"
              disabled={disabled || isSending || text.trim().length === 0}
              icon={<Send size={16} />}
              type="submit"
              variant="primary"
              className="!border-emerald-400/40 !bg-emerald-600 !text-white shadow-[0_0_22px_rgba(16,185,129,0.18)] hover:!bg-emerald-500 disabled:!border-slate-700 disabled:!bg-slate-800 disabled:!text-slate-500"
            >
              Send
            </Button>
          </div>
          {error !== null ? (
            <p className="text-sm font-medium text-rose-300">{error}</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
