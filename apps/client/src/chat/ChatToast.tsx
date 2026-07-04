import { type PublicChatMessage } from "@multiplayer-blueprint/shared";
import { useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 3500;
const MAX_VISIBLE_TOASTS = 3;

type Toast = {
  id: string;
  displayName: string;
  text: string;
};

export function ChatToast({
  messages,
  currentPlayerId,
  isChatOpen,
  onTap
}: {
  messages: PublicChatMessage[];
  currentPlayerId: string;
  isChatOpen: boolean;
  onTap: () => void;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      for (const msg of messages) {
        seenRef.current.add(msg.id);
      }
      initializedRef.current = true;
      return;
    }

    if (isChatOpen) return;

    const newMessages = messages.filter(
      (msg) =>
        !seenRef.current.has(msg.id) && msg.playerId !== currentPlayerId
    );

    for (const msg of newMessages) {
      seenRef.current.add(msg.id);
    }

    if (newMessages.length === 0) return;

    const newToasts: Toast[] = newMessages.map((msg) => ({
      id: msg.id,
      displayName: msg.displayName,
      text: msg.text
    }));

    setToasts((prev) => [...prev, ...newToasts].slice(-MAX_VISIBLE_TOASTS));
  }, [messages, currentPlayerId, isChatOpen]);

  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, TOAST_DURATION_MS);

    return () => clearTimeout(timer);
  }, [toasts]);

  useEffect(() => {
    if (isChatOpen) {
      setToasts([]);
    }
  }, [isChatOpen]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 xl:hidden">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={onTap}
          className="w-full max-w-sm animate-[slideDown_0.2s_ease-out] rounded-lg border border-cyan-200/20 bg-slate-900/95 px-4 py-3 text-left shadow-lg backdrop-blur-sm"
        >
          <p className="truncate text-sm text-slate-100">
            <span className="font-semibold">{toast.displayName}:</span>{" "}
            {toast.text}
          </p>
        </button>
      ))}
    </div>
  );
}
