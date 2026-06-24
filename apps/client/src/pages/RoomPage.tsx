import {
  displayNameSchema,
  type CardBankGameAction,
  roomCodeSchema,
  type PublicRoomState
} from "@multiplayer-blueprint/shared";
import { LogOut, Menu, MessageCircle, Play, RotateCcw, X } from "lucide-react";
import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChatPanel } from "../chat/ChatPanel.js";
import { Button } from "../components/Button.js";
import { ConnectionBadge } from "../components/ConnectionBadge.js";
import { PlayerList } from "../components/PlayerList.js";
import { ShareButton } from "../components/ShareButton.js";
import { TextInput } from "../components/TextInput.js";
import { CardBankGame } from "../game/card-bank/CardBankGame.js";
import { useSocket } from "../hooks/SocketProvider.js";
import {
  getGuestId,
  getStoredDisplayName,
  storeDisplayName
} from "../lib/guestIdentity.js";
import {
  joinRoomCommand,
  leaveRoomCommand,
  requestRoomStateCommand,
  restartRoomCommand,
  sendChatMessageCommand,
  sendGameActionCommand,
  startRoomCommand,
  updateRoomSettingsCommand
} from "../lib/socketCommands.js";

type RoomPageStatus = "joining" | "joined" | "not-found" | "error";

const missingRoomMessage =
  "This room no longer exists. Create a new room to continue.";

export function RoomPage() {
  const { roomCode: routeRoomCode } = useParams();
  const navigate = useNavigate();
  const { socket, status: connectionStatus, ensureConnected } = useSocket();
  const storedDisplayName = useMemo(() => getStoredDisplayName(), []);
  const [displayName, setDisplayName] = useState(storedDisplayName);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [needsDisplayNameConfirmation, setNeedsDisplayNameConfirmation] =
    useState(() => !displayNameSchema.safeParse(storedDisplayName).success);
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [pageStatus, setPageStatus] = useState<RoomPageStatus>("joining");
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const joinedRef = useRef(false);
  const guestId = useMemo(() => getGuestId(), []);
  const parsedRoomCode = useMemo(
    () => roomCodeSchema.safeParse(routeRoomCode ?? ""),
    [routeRoomCode]
  );
  const roomCode = parsedRoomCode.success ? parsedRoomCode.data : null;

  const applyRoomState = useCallback(
    (nextRoom: PublicRoomState) => {
      if (roomCode === null || nextRoom.code !== roomCode) {
        return;
      }

      setRoom((currentRoom) => {
        if (currentRoom !== null && nextRoom.version < currentRoom.version) {
          return currentRoom;
        }

        return nextRoom;
      });
      setPageStatus("joined");
      setPageMessage(null);
    },
    [roomCode]
  );

  const joinCurrentRoom = useCallback(
    async (name: string) => {
      if (roomCode === null) {
        setPageStatus("not-found");
        setPageMessage("Enter a valid room code.");
        return;
      }

      const parsedName = displayNameSchema.safeParse(name);
      if (!parsedName.success) {
        setNeedsDisplayNameConfirmation(true);
        setDisplayNameError(
          parsedName.error.issues[0]?.message ?? "Enter a display name."
        );
        return;
      }

      setDisplayNameError(null);
      setPageStatus("joining");
      setPageMessage(null);

      try {
        const storedName = storeDisplayName(parsedName.data);
        await ensureConnected();
        const result = await joinRoomCommand(socket, {
          roomCode,
          guestId,
          displayName: storedName
        });

        if (!result.ok) {
          joinedRef.current = false;
          if (result.error.code === "ROOM_NOT_FOUND") {
            setPageStatus("not-found");
            setPageMessage(missingRoomMessage);
            return;
          }

          setPageStatus("error");
          setPageMessage(result.error.message);
          return;
        }

        joinedRef.current = true;
        setNeedsDisplayNameConfirmation(false);
        applyRoomState(result.data.state);
      } catch {
        joinedRef.current = false;
        setPageStatus("error");
        setPageMessage("The server is still waking up or cannot be reached.");
      }
    },
    [applyRoomState, ensureConnected, guestId, roomCode, socket]
  );

  useEffect(() => {
    if (
      roomCode === null ||
      needsDisplayNameConfirmation ||
      joinedRef.current
    ) {
      return;
    }

    void joinCurrentRoom(displayName);
  }, [
    displayName,
    joinCurrentRoom,
    needsDisplayNameConfirmation,
    roomCode
  ]);

  useEffect(() => {
    const handleState = (nextRoom: PublicRoomState) => applyRoomState(nextRoom);
    const handleClosed = (payload: { roomCode: string; message: string }) => {
      if (roomCode !== null && payload.roomCode === roomCode) {
        joinedRef.current = false;
        setRoom(null);
        setPageStatus("not-found");
        setPageMessage(payload.message);
      }
    };
    const handleSocketError = (payload: { message: string }) => {
      setPageMessage(payload.message);
    };

    socket.on("room:state", handleState);
    socket.on("room:closed", handleClosed);
    socket.on("room:error", handleSocketError);

    return () => {
      socket.off("room:state", handleState);
      socket.off("room:closed", handleClosed);
      socket.off("room:error", handleSocketError);
    };
  }, [applyRoomState, roomCode, socket]);

  useEffect(() => {
    if (
      connectionStatus !== "connected" ||
      roomCode === null ||
      !joinedRef.current
    ) {
      return;
    }

    void requestRoomStateCommand(socket, { roomCode }).then((result) => {
      if (result.ok) {
        applyRoomState(result.data.state);
        return;
      }

      if (result.error.code === "NOT_IN_ROOM") {
        void joinCurrentRoom(displayName);
        return;
      }

      if (result.error.code === "ROOM_NOT_FOUND") {
        setRoom(null);
        setPageStatus("not-found");
        setPageMessage(missingRoomMessage);
        return;
      }

      setPageMessage(result.error.message);
    });
  }, [
    applyRoomState,
    connectionStatus,
    displayName,
    joinCurrentRoom,
    roomCode,
    socket
  ]);

  const handleNameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void joinCurrentRoom(displayName);
  };

  const handleLeave = async () => {
    if (roomCode !== null) {
      await leaveRoomCommand(socket, { roomCode });
    }
    joinedRef.current = false;
    navigate("/");
  };

  const handleStart = async (): Promise<string | null> => {
    if (roomCode === null) {
      return "Enter a valid room code.";
    }

    const result = await startRoomCommand(socket, { roomCode });
    if (!result.ok) {
      return result.error.message;
    }

    applyRoomState(result.data.state);
    return null;
  };

  const handleRestart = async (): Promise<string | null> => {
    if (roomCode === null) {
      return "Enter a valid room code.";
    }

    const result = await restartRoomCommand(socket, { roomCode });
    if (!result.ok) {
      return result.error.message;
    }

    applyRoomState(result.data.state);
    return null;
  };

  const handleUpdateSettings = async (
    nextExtraLivesEnabled: boolean
  ): Promise<string | null> => {
    if (roomCode === null) {
      return "Enter a valid room code.";
    }

    const result = await updateRoomSettingsCommand(socket, {
      roomCode,
      extraLivesEnabled: nextExtraLivesEnabled
    });
    if (!result.ok) {
      return result.error.message;
    }

    applyRoomState(result.data.state);
    return null;
  };

  const handleChatSend = async (text: string): Promise<string | null> => {
    if (roomCode === null) {
      return "Enter a valid room code.";
    }

    const result = await sendChatMessageCommand(socket, {
      roomCode,
      text
    });
    if (!result.ok) {
      return result.error.message;
    }

    applyRoomState(result.data.state);
    return null;
  };

  const handleGameAction = async (
    action: CardBankGameAction
  ): Promise<string | null> => {
    if (roomCode === null) {
      return "Enter a valid room code.";
    }

    const result = await sendGameActionCommand(socket, {
      roomCode,
      action
    });

    if (!result.ok) {
      return result.error.message;
    }

    applyRoomState(result.data.state);
    return null;
  };

  if (roomCode === null) {
    return (
      <MissingRoom
        message="Enter a valid room code."
        onCreate={() => navigate("/")}
      />
    );
  }

  if (needsDisplayNameConfirmation && !joinedRef.current) {
    return (
      <main className="min-h-screen bg-[#041520] px-4 py-8 text-slate-100">
        <section className="mx-auto grid max-w-md gap-5 rounded-md border border-cyan-200/15 bg-slate-950/55 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
              Room {roomCode}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-100">
              Choose a display name
            </h1>
          </div>
          <form className="grid gap-4" onSubmit={handleNameSubmit}>
            <TextInput
              autoComplete="nickname"
              error={displayNameError}
              label="Display name"
              maxLength={24}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ada"
              tone="dark"
              value={displayName}
            />
            <Button icon={<Play size={16} />} type="submit" variant="primary">
              Join Room
            </Button>
          </form>
        </section>
      </main>
    );
  }

  if (pageStatus === "not-found") {
    return (
      <MissingRoom
        message={pageMessage ?? missingRoomMessage}
        onCreate={() => navigate("/")}
      />
    );
  }

  if (room === null) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#041520] px-4 text-slate-100">
        <section className="grid max-w-md gap-4 rounded-md border border-cyan-200/15 bg-slate-950/55 p-5 text-center shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
          <ConnectionBadge status={connectionStatus} tone="dark" />
          <h1 className="text-2xl font-bold text-slate-100">Joining room</h1>
          <p className="text-sm leading-6 text-slate-400">
            {pageMessage ?? "Waiting for the server to return the room state."}
          </p>
        </section>
      </main>
    );
  }

  const currentPlayer = room.players.find((player) => player.id === guestId);
  const hostPlayer = room.players.find((player) => player.id === room.hostPlayerId);
  const isHost = room.hostPlayerId === guestId;
  const connected = currentPlayer?.connected ?? false;
  const connectedPlayerCount = room.players.filter((player) => player.connected).length;
  const hostDisconnected = hostPlayer !== undefined && !hostPlayer.connected;
  const securedCardCountByPlayerId = Object.fromEntries(
    (room.gameState?.players ?? []).map((player) => [
      player.playerId,
      player.securedCardCount
    ])
  );

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

            <BrandTitle />

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
                icon={<LogOut size={16} />}
                onClick={handleLeave}
                type="button"
                variant="ghost"
                className="hidden !border-cyan-300/20 !bg-slate-950/45 !text-slate-100 hover:!bg-cyan-950/60 sm:inline-flex"
              >
                Leave
              </Button>
              <IconButton
                className="sm:hidden"
                label="Leave room"
                onClick={handleLeave}
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

          {(hostDisconnected || pageMessage !== null) ? (
            <div className="rounded-md border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 lg:col-span-2 xl:col-span-3">
              {hostDisconnected ? "Host disconnected. " : null}
              {pageMessage}
            </div>
          ) : null}

          <aside className="hidden content-start gap-5 rounded-md border border-cyan-200/15 bg-slate-950/45 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)] lg:grid">
            <RoomSidebar
              connectedPlayerCount={connectedPlayerCount}
              currentPlayerId={guestId}
              hostPlayerId={room.hostPlayerId}
              isHost={isHost}
              onRestart={handleRestart}
              onUpdateSettings={handleUpdateSettings}
              onStart={handleStart}
              players={room.players}
              room={room}
              securedCardCountByPlayerId={securedCardCountByPlayerId}
            />
          </aside>

          <CardBankGame
            connected={connected}
            currentPlayerId={guestId}
            onAction={handleGameAction}
            room={room}
          />

          <aside className="hidden h-full overflow-hidden rounded-md border border-cyan-200/15 bg-slate-950/35 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)] xl:block">
            <ChatPanel
              disabled={connectionStatus !== "connected"}
              fill
              messages={room.chatMessages}
              onSend={handleChatSend}
            />
          </aside>
        </div>
      </div>

      {isRoomMenuOpen ? (
        <MobileModal
          title={`Room ${room.code}`}
          onClose={() => setIsRoomMenuOpen(false)}
        >
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-md border border-cyan-200/15 bg-slate-950/45 p-3">
              <ConnectionBadge status={connectionStatus} tone="dark" />
              <ShareButton roomCode={room.code} tone="dark" />
            </div>
            <RoomSidebar
              connectedPlayerCount={connectedPlayerCount}
              currentPlayerId={guestId}
              hostPlayerId={room.hostPlayerId}
              isHost={isHost}
              onRestart={handleRestart}
              onUpdateSettings={handleUpdateSettings}
              onStart={handleStart}
              players={room.players}
              room={room}
              securedCardCountByPlayerId={securedCardCountByPlayerId}
            />
          </div>
        </MobileModal>
      ) : null}

      {isChatOpen ? (
        <MobileModal title="Room Chat" onClose={() => setIsChatOpen(false)}>
          <ChatPanel
            disabled={connectionStatus !== "connected"}
            fill
            messages={room.chatMessages}
            onSend={handleChatSend}
          />
        </MobileModal>
      ) : null}
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

function BrandTitle() {
  return (
    <div className="flex min-w-0 items-center justify-center gap-2 lg:gap-3">
      <div className="relative h-8 w-9 shrink-0 lg:h-11 lg:w-12">
        <div className="absolute left-0 top-1 h-7 w-5 rotate-[-10deg] rounded border-2 border-white bg-emerald-500 shadow-[0_8px_18px_rgba(0,0,0,0.28)] lg:h-9 lg:w-7" />
        <div className="absolute right-0 top-0 h-8 w-6 rotate-[8deg] rounded border-2 border-white bg-cyan-500 shadow-[0_8px_18px_rgba(0,0,0,0.28)] lg:h-11 lg:w-8" />
      </div>
      <span className="whitespace-nowrap text-xs font-black uppercase tracking-[0.08em] text-white drop-shadow min-[380px]:text-sm sm:text-2xl lg:text-4xl">
        Card Banking
      </span>
    </div>
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

function RoomSidebar({
  players,
  hostPlayerId,
  currentPlayerId,
  room,
  isHost,
  connectedPlayerCount,
  onStart,
  onRestart,
  onUpdateSettings,
  securedCardCountByPlayerId
}: {
  players: PublicRoomState["players"];
  hostPlayerId: string;
  currentPlayerId: string;
  room: PublicRoomState;
  isHost: boolean;
  connectedPlayerCount: number;
  onStart: () => Promise<string | null>;
  onRestart: () => Promise<string | null>;
  onUpdateSettings: (extraLivesEnabled: boolean) => Promise<string | null>;
  securedCardCountByPlayerId: Readonly<Record<string, number>>;
}) {
  return (
    <div className="grid content-start gap-5">
      <PlayerList
        currentPlayerId={currentPlayerId}
        hostPlayerId={hostPlayerId}
        players={players}
        securedCardCountByPlayerId={securedCardCountByPlayerId}
      />
      <RuleToggle
        isHost={isHost}
        onUpdateSettings={onUpdateSettings}
        room={room}
      />
      <HostControls
        connectedPlayerCount={connectedPlayerCount}
        isHost={isHost}
        onRestart={onRestart}
        onStart={onStart}
        room={room}
      />
      <p className="rounded-md border border-cyan-200/10 bg-slate-950/35 px-3 py-2 text-xs leading-5 text-slate-500">
        Counts update when cards are secured.
      </p>
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

function RuleToggle({
  room,
  isHost,
  onUpdateSettings
}: {
  room: PublicRoomState;
  isHost: boolean;
  onUpdateSettings: (extraLivesEnabled: boolean) => Promise<string | null>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const editable = isHost && room.phase !== "playing";

  const handleToggle = async (nextEnabled: boolean) => {
    setIsSubmitting(true);
    setMessage(null);
    const result = await onUpdateSettings(nextEnabled);
    setIsSubmitting(false);
    setMessage(result);
  };

  return (
    <section className="grid gap-2 rounded-md border border-cyan-200/15 bg-slate-950/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Room rules
      </p>
      <label
        className={`flex items-start gap-3 ${
          editable ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <input
          checked={room.extraLivesEnabled}
          className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
          disabled={!editable || isSubmitting}
          onChange={(event) => void handleToggle(event.target.checked)}
          type="checkbox"
        />
        <span className="grid gap-0.5">
          <span className="text-sm font-semibold text-slate-100">
            Extra lives
          </span>
          <span className="text-xs leading-5 text-slate-400">
            3 consecutive cards grant a life that blocks a bust.
          </span>
        </span>
      </label>
      {!isHost ? (
        <p className="text-xs text-slate-500">Only the host can change rules.</p>
      ) : room.phase === "playing" ? (
        <p className="text-xs text-slate-500">
          Rules are locked while a game is in progress.
        </p>
      ) : null}
      {message !== null ? (
        <p className="text-xs font-medium text-rose-300">{message}</p>
      ) : null}
    </section>
  );
}

function HostControls({
  room,
  isHost,
  connectedPlayerCount,
  onStart,
  onRestart
}: {
  room: PublicRoomState;
  isHost: boolean;
  connectedPlayerCount: number;
  onStart: () => Promise<string | null>;
  onRestart: () => Promise<string | null>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const runCommand = async (command: () => Promise<string | null>) => {
    setIsSubmitting(true);
    setMessage(null);
    const result = await command();
    setIsSubmitting(false);
    setMessage(result);
  };

  if (!isHost) {
    return (
      <section className="rounded-md border border-cyan-200/15 bg-slate-950/40 p-3 text-sm text-slate-400">
        Waiting for the host.
      </section>
    );
  }

  const canStartWaiting = room.phase === "waiting" && connectedPlayerCount >= 2;
  const canRestart = room.phase === "finished";

  return (
    <section className="grid gap-3">
      {room.phase === "waiting" ? (
        <Button
          disabled={!canStartWaiting || isSubmitting}
          icon={<Play size={16} />}
          onClick={() => void runCommand(onStart)}
          type="button"
          variant="primary"
          className="!border-emerald-300/50 !bg-emerald-600 !text-white shadow-[0_0_24px_rgba(16,185,129,0.2)] hover:!bg-emerald-500 disabled:!border-slate-700 disabled:!bg-slate-800 disabled:!text-slate-500"
        >
          Start Game
        </Button>
      ) : null}

      {canRestart ? (
        <Button
          disabled={isSubmitting}
          icon={<RotateCcw size={16} />}
          onClick={() => void runCommand(onRestart)}
          type="button"
          variant="primary"
          className="!border-emerald-300/50 !bg-emerald-600 !text-white shadow-[0_0_24px_rgba(16,185,129,0.2)] hover:!bg-emerald-500 disabled:!border-slate-700 disabled:!bg-slate-800 disabled:!text-slate-500"
        >
          Play Again
        </Button>
      ) : null}

      {room.phase === "waiting" && connectedPlayerCount < 2 ? (
        <p className="text-sm text-slate-400">
          At least two connected players are required.
        </p>
      ) : null}

      {message !== null ? (
        <p className="text-sm font-medium text-rose-300">{message}</p>
      ) : null}
    </section>
  );
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
          Create a New Room
        </Button>
      </section>
    </main>
  );
}
