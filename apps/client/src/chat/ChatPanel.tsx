import {
  CHAT_MESSAGE_MAX_LENGTH,
  type PublicChatMessage
} from "@multiplayer-blueprint/shared";
import { Send } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "../components/Button.js";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit"
});

export function ChatPanel({
  messages,
  disabled,
  onSend
}: {
  messages: PublicChatMessage[];
  disabled: boolean;
  onSend: (text: string) => Promise<string | null>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
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
      return;
    }

    setError(result);
  };

  return (
    <section className="grid min-h-[22rem] gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-950">Room Chat</h2>
        <span
          className={`text-xs ${
            remainingCharacters < 0 ? "text-rose-700" : "text-slate-500"
          }`}
        >
          {remainingCharacters}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-md border border-slate-200 bg-white p-3">
        <div className="min-h-48 flex-1 overflow-y-auto pr-1">
          {renderedMessages.length === 0 ? (
            <p className="text-sm text-slate-500">No messages yet.</p>
          ) : (
            <ol className="grid gap-3">
              {renderedMessages.map((message) => (
                <li key={message.id} className="grid gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-950">
                      {message.displayName}
                    </span>
                    <time className="shrink-0 text-xs text-slate-500">
                      {timeFormatter.format(new Date(message.createdAt))}
                    </time>
                  </div>
                  <p className="break-words text-sm leading-6 text-slate-700">
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
              className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              disabled={disabled || isSending}
              maxLength={CHAT_MESSAGE_MAX_LENGTH + 20}
              onChange={(event) => setText(event.target.value)}
              placeholder="Message this room"
              value={text}
            />
            <Button
              aria-label="Send chat message"
              disabled={disabled || isSending || text.trim().length === 0}
              icon={<Send size={16} />}
              type="submit"
              variant="primary"
            >
              Send
            </Button>
          </div>
          {error !== null ? (
            <p className="text-sm font-medium text-rose-700">{error}</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
