import type { PublicRoomState } from "@multiplayer-blueprint/shared";
import { LogOut, Menu, MessageCircle, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ChatPanel } from "../chat/ChatPanel.js";
import { ChatToast } from "../chat/ChatToast.js";
import { Button } from "../components/Button.js";
import { ConnectionBadge } from "../components/ConnectionBadge.js";
import { ShareButton } from "../components/ShareButton.js";
import type { ConnectionStatus } from "../hooks/SocketProvider.js";

export function RoomShell({
  brand,
  children,
  connectionStatus,
  currentPlayerId,
  message,
  onLeave,
  onSendChatMessage,
  room,
  roomMenu,
  roomMenuTitle
}: {
  brand: ReactNode;
  children: ReactNode;
  connectionStatus: ConnectionStatus;
  currentPlayerId: string;
  message: string | null;
  onLeave: () => Promise<void>;
  onSendChatMessage: (text: string) => Promise<string | null>;
  room: PublicRoomState;
  roomMenu: ReactNode;
  roomMenuTitle: string;
}) {
  const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const hostPlayer = room.players.find(
    (player) => player.id === room.hostPlayerId
  );
  const hostDisconnected = hostPlayer !== undefined && !hostPlayer.connected;

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#041520] text-slate-100">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,#051723_0%,#062535_54%,#041520_100%)]">
        <header className="shrink-0 border-b border-cyan-200/15 bg-[#061824]/95 shadow-[0_14px_40px_rgba(0,0,0,0.25)] backdrop-blur">
          <div className="mx-auto grid max-w-[104rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-5 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)_minmax(20rem,25rem)]">
            <div className="lg:hidden">
              <IconButton
                label="Open room menu"
                onClick={() => setIsRoomMenuOpen(true)}
              >
                <Menu size={22} />
              </IconButton>
            </div>

            <RoomCodeCard room={room} />

            {brand}

            <div className="flex min-w-0 items-center justify-end gap-2">
              <ConnectionBadge
                className="hidden sm:inline-flex"
                status={connectionStatus}
                tone="dark"
              />
              <ShareButton
                className="hidden lg:flex"
                roomCode={room.code}
                tone="dark"
              />
              <IconButton
                className="xl:hidden"
                label="Open chat"
                onClick={() => setIsChatOpen(true)}
              >
                <MessageCircle size={21} />
              </IconButton>
              <Button
                className="hidden !border-cyan-300/20 !bg-slate-950/45 !text-slate-100 hover:!bg-cyan-950/60 sm:inline-flex"
                icon={<LogOut size={16} />}
                onClick={() => void onLeave()}
                type="button"
                variant="ghost"
              >
                Leave
              </Button>
              <IconButton
                className="sm:hidden"
                label="Leave room"
                onClick={() => void onLeave()}
              >
                <LogOut size={21} />
              </IconButton>
            </div>
          </div>
        </header>

        <div className="themed-scrollbar mx-auto grid w-full max-w-[104rem] min-h-0 flex-1 gap-4 overflow-y-auto px-3 py-2 lg:py-4 sm:px-5 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)_minmax(20rem,25rem)]">
          {connectionStatus !== "connected" ? (
            <div className="rounded-md border border-amber-300/35 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-100 lg:col-span-2 xl:col-span-3">
              Socket reconnecting. The latest room state will be requested after
              the connection returns.
            </div>
          ) : null}

          {hostDisconnected || message !== null ? (
            <div className="rounded-md border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 lg:col-span-2 xl:col-span-3">
              {hostDisconnected ? "Host disconnected. " : null}
              {message}
            </div>
          ) : null}

          <aside className="hidden min-h-0 overflow-hidden rounded-md border border-cyan-200/15 bg-slate-950/45 shadow-[0_20px_70px_rgba(0,0,0,0.22)] lg:block">
            {roomMenu}
          </aside>

          {children}

          <aside className="hidden h-full overflow-hidden rounded-md border border-cyan-200/15 bg-slate-950/35 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)] xl:block">
            <ChatPanel
              disabled={connectionStatus !== "connected"}
              fill
              messages={room.chatMessages}
              onSend={onSendChatMessage}
            />
          </aside>
        </div>
      </div>

      {isRoomMenuOpen ? (
        <MobileModal
          onClose={() => setIsRoomMenuOpen(false)}
          title={roomMenuTitle}
        >
          {roomMenu}
        </MobileModal>
      ) : null}

      {isChatOpen ? (
        <MobileModal onClose={() => setIsChatOpen(false)} title="Room Chat">
          <ChatPanel
            disabled={connectionStatus !== "connected"}
            fill
            messages={room.chatMessages}
            onSend={onSendChatMessage}
          />
        </MobileModal>
      ) : null}

      <ChatToast
        currentPlayerId={currentPlayerId}
        isChatOpen={isChatOpen}
        messages={room.chatMessages}
        onTap={() => setIsChatOpen(true)}
      />
    </main>
  );
}

function IconButton({
  children,
  className = "",
  label,
  onClick
}: {
  children: ReactNode;
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`inline-grid h-11 w-11 place-items-center rounded-md border border-cyan-300/20 bg-slate-950/55 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-cyan-950/60 ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function RoomCodeCard({ room }: { room: PublicRoomState }) {
  return (
    <div className="hidden min-w-0 rounded-md border border-cyan-200/20 bg-slate-950/50 px-4 py-3 lg:block">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Room Code
      </p>
      <div className="mt-1 flex items-center gap-3">
        <p className="truncate text-2xl font-black tracking-wide text-white">
          {room.code}
        </p>
        <span className="rounded-md border border-cyan-300/20 bg-slate-900/80 px-2 py-1 text-xs font-semibold capitalize text-sky-300">
          {room.phase}
        </span>
      </div>
    </div>
  );
}

function MobileModal({
  children,
  onClose,
  title
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/65 p-3 backdrop-blur-sm">
      <section className="mx-auto grid h-full max-w-lg grid-rows-[auto_minmax(0,1fr)] rounded-md border border-cyan-200/20 bg-[#061824] shadow-[0_24px_90px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between gap-3 border-b border-cyan-200/15 px-4 py-3">
          <h2 className="min-w-0 truncate text-base font-extrabold text-slate-100">
            {title}
          </h2>
          <IconButton label="Close modal" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}
