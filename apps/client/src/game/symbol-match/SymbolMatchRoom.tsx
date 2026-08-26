import {
  SYMBOL_MATCH_TARGET_SCORE_OPTIONS,
  type PublicSymbolMatchResult,
  type PublicSymbolMatchRoomState,
  type SymbolMatchGameAction,
  type SymbolMatchSettings,
  type SymbolMatchTargetScore
} from "@multiplayer-blueprint/shared";
import { Play, RotateCcw, Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { ConnectionBadge } from "../../components/ConnectionBadge.js";
import { PlayerList } from "../../components/PlayerList.js";
import { ShareButton } from "../../components/ShareButton.js";
import type { ConnectionStatus } from "../../hooks/SocketProvider.js";
import { RoomShell } from "../../rooms/RoomShell.js";
import { SymbolMatchGame } from "./SymbolMatchGame.js";
import { SymbolMatchInstructions } from "./SymbolMatchInstructions.js";

export function SymbolMatchRoom({
  connectionStatus,
  currentPlayerId,
  message,
  onAction,
  onLeave,
  onRestart,
  onSendChatMessage,
  onStart,
  onUpdateSettings,
  room
}: {
  connectionStatus: ConnectionStatus;
  currentPlayerId: string;
  message: string | null;
  onAction: (action: SymbolMatchGameAction) => Promise<string | null>;
  onLeave: () => Promise<void>;
  onRestart: () => Promise<string | null>;
  onSendChatMessage: (text: string) => Promise<string | null>;
  onStart: () => Promise<string | null>;
  onUpdateSettings: (settings: SymbolMatchSettings) => Promise<string | null>;
  room: PublicSymbolMatchRoomState;
}) {
  const currentPlayer = room.players.find(
    (player) => player.id === currentPlayerId
  );
  const isHost = room.hostPlayerId === currentPlayerId;
  const connectedPlayerCount = room.players.filter(
    (player) => player.connected
  ).length;
  const roomMenu = (
    <div className="themed-scrollbar h-full overflow-y-auto p-4">
      <SymbolMatchInstructions />
    </div>
  );

  return (
    <RoomShell
      brand={<SymbolMatchBrand />}
      connectionStatus={connectionStatus}
      currentPlayerId={currentPlayerId}
      message={message}
      onLeave={onLeave}
      onSendChatMessage={onSendChatMessage}
      room={room}
      roomMenu={roomMenu}
      roomMenuTitle="How to Play"
    >
      {room.phase === "waiting" ? (
        <SymbolMatchSetup
          connectedPlayerCount={connectedPlayerCount}
          connectionStatus={connectionStatus}
          currentPlayerId={currentPlayerId}
          isHost={isHost}
          onStart={onStart}
          onUpdateSettings={onUpdateSettings}
          room={room}
        />
      ) : room.phase === "finished" ? (
        <SymbolMatchFinishedSetup
          currentPlayerId={currentPlayerId}
          isHost={isHost}
          onRestart={onRestart}
          onUpdateSettings={onUpdateSettings}
          room={room}
        />
      ) : (
        <SymbolMatchGame
          connected={currentPlayer?.connected ?? false}
          currentPlayerId={currentPlayerId}
          onAction={onAction}
          room={room}
        />
      )}
    </RoomShell>
  );
}

function SymbolMatchBrand() {
  return (
    <div className="flex min-w-0 items-center justify-center gap-2 lg:gap-3">
      <div
        aria-hidden="true"
        className="relative h-9 w-9 shrink-0 lg:h-12 lg:w-12"
      >
        <div className="absolute left-0 top-0 h-7 w-7 rounded-full border-[3px] border-[#171717] bg-white shadow-[2px_3px_0_#171717] lg:h-9 lg:w-9" />
        <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full border-[3px] border-[#171717] bg-cyan-300 shadow-[2px_3px_0_#171717] lg:h-9 lg:w-9" />
      </div>
      <span className="whitespace-nowrap text-xs font-black uppercase tracking-[0.08em] text-white drop-shadow min-[380px]:text-sm sm:text-2xl lg:text-4xl">
        Symbol Match
      </span>
    </div>
  );
}

function SymbolMatchSetup({
  connectedPlayerCount,
  connectionStatus,
  currentPlayerId,
  isHost,
  onStart,
  onUpdateSettings,
  room
}: {
  connectedPlayerCount: number;
  connectionStatus: ConnectionStatus;
  currentPlayerId: string;
  isHost: boolean;
  onStart: () => Promise<string | null>;
  onUpdateSettings: (settings: SymbolMatchSettings) => Promise<string | null>;
  room: PublicSymbolMatchRoomState;
}) {
  return (
    <section className="grid content-start gap-5 rounded-md border border-cyan-200/15 bg-slate-950/45 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
      <div className="flex flex-wrap items-center gap-3">
        <ConnectionBadge status={connectionStatus} tone="dark" />
        <ShareButton roomCode={room.code} tone="dark" />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
          Match setup
        </p>
        <h2 className="mt-1 text-2xl font-extrabold text-white">
          Find the shared symbol first
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Invite one friend. The match begins with a 3–2–1 countdown when both
          players are connected and the host presses Start.
        </p>
      </div>

      <PlayerList
        currentPlayerId={currentPlayerId}
        hostPlayerId={room.hostPlayerId}
        players={room.players}
      />

      <TargetScoreSelector
        isHost={isHost}
        onUpdateSettings={onUpdateSettings}
        room={room}
      />

      <SetupStartControls
        connectedPlayerCount={connectedPlayerCount}
        isHost={isHost}
        onStart={onStart}
      />
    </section>
  );
}

function TargetScoreSelector({
  isHost,
  onUpdateSettings,
  room
}: {
  isHost: boolean;
  onUpdateSettings: (settings: SymbolMatchSettings) => Promise<string | null>;
  room: PublicSymbolMatchRoomState;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateTarget = async (targetScore: SymbolMatchTargetScore) => {
    if (targetScore === room.game.settings.targetScore) {
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    const result = await onUpdateSettings({ targetScore });
    setIsSubmitting(false);
    setMessage(result);
  };

  return (
    <fieldset className="grid gap-2 rounded-md border border-cyan-200/15 bg-slate-950/40 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Points to win
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {SYMBOL_MATCH_TARGET_SCORE_OPTIONS.map((targetScore) => (
          <label
            className={`grid min-h-11 place-items-center rounded-md border px-3 py-2 text-sm font-bold transition ${
              room.game.settings.targetScore === targetScore
                ? "border-cyan-300/70 bg-cyan-500/20 text-cyan-100"
                : "border-cyan-200/15 bg-slate-950/40 text-slate-300"
            } ${isHost ? "cursor-pointer hover:border-cyan-200/40" : "cursor-default"}`}
            key={targetScore}
          >
            <input
              checked={room.game.settings.targetScore === targetScore}
              className="sr-only"
              disabled={!isHost || isSubmitting}
              name="room-symbol-match-target-score"
              onChange={() => void updateTarget(targetScore)}
              type="radio"
              value={targetScore}
            />
            {targetScore}
          </label>
        ))}
      </div>
      <p className="text-xs leading-5 text-slate-400">
        {isHost
          ? "You can change this before the match starts."
          : "Only the host can change the winning score."}
      </p>
      {message !== null ? (
        <p className="text-xs font-medium text-rose-300">{message}</p>
      ) : null}
    </fieldset>
  );
}

function SetupStartControls({
  connectedPlayerCount,
  isHost,
  onStart
}: {
  connectedPlayerCount: number;
  isHost: boolean;
  onStart: () => Promise<string | null>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isHost) {
    return (
      <div className="rounded-md border border-cyan-200/15 bg-slate-950/40 p-3 text-sm text-slate-400">
        Waiting for the host to start the match.
      </div>
    );
  }

  const handleStart = async () => {
    setIsSubmitting(true);
    setMessage(null);
    const result = await onStart();
    setIsSubmitting(false);
    setMessage(result);
  };
  const canStart = connectedPlayerCount === 2;

  return (
    <div className="grid gap-2">
      <Button
        className="!border-cyan-300/60 !bg-cyan-600 !text-white shadow-[0_0_24px_rgba(8,145,178,0.25)] hover:!bg-cyan-500 disabled:!border-slate-700 disabled:!bg-slate-800 disabled:!text-slate-500"
        disabled={!canStart || isSubmitting}
        icon={<Play size={16} />}
        onClick={() => void handleStart()}
        type="button"
        variant="primary"
      >
        Start Match
      </Button>
      {!canStart ? (
        <p className="text-sm text-slate-400">
          Exactly two connected players are required.
        </p>
      ) : null}
      {message !== null ? (
        <p className="text-sm font-medium text-rose-300">{message}</p>
      ) : null}
    </div>
  );
}

function SymbolMatchFinishedSetup({
  currentPlayerId,
  isHost,
  onRestart,
  onUpdateSettings,
  room
}: {
  currentPlayerId: string;
  isHost: boolean;
  onRestart: () => Promise<string | null>;
  onUpdateSettings: (settings: SymbolMatchSettings) => Promise<string | null>;
  room: PublicSymbolMatchRoomState;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const result =
    room.game.state?.status === "finished" ? room.game.state.result : null;

  const handleRestart = async () => {
    setIsSubmitting(true);
    setMessage(null);
    const nextMessage = await onRestart();
    setIsSubmitting(false);
    setMessage(nextMessage);
  };

  return (
    <section
      aria-atomic="true"
      aria-live="polite"
      className="grid content-start gap-5 rounded-md border border-cyan-200/15 bg-slate-950/45 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)]"
    >
      <div className="grid justify-items-center gap-3 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full border border-amber-300/40 bg-amber-400/15 text-amber-200">
          <Trophy size={28} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
            Match complete
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-white">
            {resultTitle(result, currentPlayerId, room)}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {resultDescription(result)}
          </p>
        </div>
      </div>

      <ScoreSummary currentPlayerId={currentPlayerId} room={room} />
      <PlayerList
        currentPlayerId={currentPlayerId}
        hostPlayerId={room.hostPlayerId}
        players={room.players}
      />
      <TargetScoreSelector
        isHost={isHost}
        onUpdateSettings={onUpdateSettings}
        room={room}
      />

      {isHost ? (
        <div className="grid gap-2">
          <Button
            className="!border-cyan-300/60 !bg-cyan-600 !text-white shadow-[0_0_24px_rgba(8,145,178,0.25)] hover:!bg-cyan-500 disabled:!border-slate-700 disabled:!bg-slate-800 disabled:!text-slate-500"
            disabled={isSubmitting}
            icon={<RotateCcw size={16} />}
            onClick={() => void handleRestart()}
            type="button"
            variant="primary"
          >
            Set Up Rematch
          </Button>
          {message !== null ? (
            <p className="text-sm font-medium text-rose-300">{message}</p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-cyan-200/15 bg-slate-950/40 p-3 text-sm text-slate-400">
          Waiting for the host to set up a rematch.
        </div>
      )}
    </section>
  );
}

function ScoreSummary({
  currentPlayerId,
  room
}: {
  currentPlayerId: string;
  room: PublicSymbolMatchRoomState;
}) {
  const state = room.game.state;
  const currentScore = state?.scores.find(
    ({ playerId }) => playerId === currentPlayerId
  )?.points;
  const opponent = room.players.find(({ id }) => id !== currentPlayerId);
  const opponentScore = state?.scores.find(
    ({ playerId }) => playerId === opponent?.id
  )?.points;

  return (
    <div className="flex min-w-0 items-center justify-center gap-2 rounded-md border border-cyan-200/15 bg-slate-950/45 px-4 py-3 text-lg font-extrabold text-white">
      <span className="truncate">You</span>
      <span className="text-cyan-200">{currentScore ?? 0}</span>
      <span className="text-slate-500">•</span>
      <span className="text-amber-200">{opponentScore ?? 0}</span>
      <span className="truncate">{opponent?.displayName ?? "Opponent"}</span>
    </div>
  );
}

function resultTitle(
  result: PublicSymbolMatchResult | null,
  currentPlayerId: string,
  room: PublicSymbolMatchRoomState
): string {
  if (result?.kind === "winner") {
    if (result.winnerPlayerId === currentPlayerId) {
      return "You won!";
    }
    return `${
      room.players.find(({ id }) => id === result.winnerPlayerId)
        ?.displayName ?? "Your opponent"
    } won`;
  }
  if (result?.kind === "tie") {
    return "It’s a tie";
  }
  if (result?.kind === "abandoned") {
    return "Match abandoned";
  }
  return "Match complete";
}

function resultDescription(result: PublicSymbolMatchResult | null): string {
  switch (result?.reason) {
    case "target-score":
      return "The winning score was reached.";
    case "deck-score":
      return "The deck ended, so the higher score won.";
    case "deck-exhausted":
      return "The deck ended with equal scores.";
    case "forfeit":
      return "The reconnect grace period expired.";
    case "all-disconnected":
      return "Neither player returned before the reconnect period ended.";
    default:
      return "The server has finalized this match.";
  }
}
