import {
  displayNameSchema,
  type CardBankGameAction,
  roomCodeSchema,
  type PublicRoomState
} from "@multiplayer-blueprint/shared";
import { LogOut, Play, RotateCcw } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  startRoomCommand
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
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <section className="mx-auto grid max-w-md gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Room {roomCode}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">
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
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <section className="grid max-w-md gap-4 rounded-md border border-slate-200 bg-white p-5 text-center shadow-panel">
          <ConnectionBadge status={connectionStatus} />
          <h1 className="text-2xl font-bold text-slate-950">Joining room</h1>
          <p className="text-sm leading-6 text-slate-600">
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

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6">
        <header className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-panel lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Room
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="break-all text-2xl font-bold text-slate-950 sm:text-3xl">
                {room.code}
              </h1>
              <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold capitalize text-slate-800">
                {room.phase}
              </span>
            </div>
            {hostDisconnected ? (
              <p className="mt-2 text-sm font-medium text-amber-800">
                Host disconnected.
              </p>
            ) : null}
            {pageMessage !== null ? (
              <p className="mt-2 text-sm font-medium text-rose-700">
                {pageMessage}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ConnectionBadge status={connectionStatus} />
            <ShareButton roomCode={room.code} />
            <Button
              icon={<LogOut size={16} />}
              onClick={handleLeave}
              type="button"
              variant="ghost"
            >
              Leave
            </Button>
          </div>
        </header>

        {connectionStatus !== "connected" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Socket reconnecting. The latest room state will be requested after
            the connection returns.
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(17rem,22rem)_1fr_minmax(19rem,24rem)]">
          <aside className="grid content-start gap-5 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
            <PlayerList
              currentPlayerId={guestId}
              hostPlayerId={room.hostPlayerId}
              players={room.players}
            />
            <HostControls
              connectedPlayerCount={connectedPlayerCount}
              isHost={isHost}
              onRestart={handleRestart}
              onStart={handleStart}
              room={room}
            />
          </aside>

          <CardBankGame
            connected={connected}
            currentPlayerId={guestId}
            onAction={handleGameAction}
            room={room}
          />

          <ChatPanel
            disabled={connectionStatus !== "connected"}
            messages={room.chatMessages}
            onSend={handleChatSend}
          />
        </div>
      </div>
    </main>
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
      <section className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
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
        >
          Play Again
        </Button>
      ) : null}

      {room.phase === "waiting" && connectedPlayerCount < 2 ? (
        <p className="text-sm text-slate-500">
          At least two connected players are required.
        </p>
      ) : null}

      {message !== null ? (
        <p className="text-sm font-medium text-rose-700">{message}</p>
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
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <section className="grid max-w-md gap-4 rounded-md border border-slate-200 bg-white p-5 text-center shadow-panel">
        <h1 className="text-2xl font-bold text-slate-950">Room unavailable</h1>
        <p className="text-sm leading-6 text-slate-600">{message}</p>
        <Button onClick={onCreate} type="button" variant="primary">
          Create a New Room
        </Button>
      </section>
    </main>
  );
}
