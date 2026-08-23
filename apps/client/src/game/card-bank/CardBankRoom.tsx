import {
  type CardBankGameAction,
  type CardBankSettings,
  type PublicCardBankRoomState
} from "@multiplayer-blueprint/shared";
import { Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { ConnectionBadge } from "../../components/ConnectionBadge.js";
import { PlayerList } from "../../components/PlayerList.js";
import { ShareButton } from "../../components/ShareButton.js";
import type { ConnectionStatus } from "../../hooks/SocketProvider.js";
import { RoomShell } from "../../rooms/RoomShell.js";
import { BankingHistory, useBankingHistory } from "./BankingHistory.js";
import { CardBankGame } from "./CardBankGame.js";
import { GameInstructions } from "./GameInstructions.js";

export function CardBankRoom({
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
  onAction: (action: CardBankGameAction) => Promise<string | null>;
  onLeave: () => Promise<void>;
  onRestart: () => Promise<string | null>;
  onSendChatMessage: (text: string) => Promise<string | null>;
  onStart: () => Promise<string | null>;
  onUpdateSettings: (settings: CardBankSettings) => Promise<string | null>;
  room: PublicCardBankRoomState;
}) {
  const [sidebarTab, setSidebarTab] = useState<"rules" | "history">("rules");
  const bankingHistory = useBankingHistory(
    room.game.state,
    room.players,
    room.version
  );
  const currentPlayer = room.players.find(
    (player) => player.id === currentPlayerId
  );
  const connected = currentPlayer?.connected ?? false;
  const connectedPlayerCount = room.players.filter(
    (player) => player.connected
  ).length;
  const isHost = room.hostPlayerId === currentPlayerId;
  const roomMenuTitle = sidebarTab === "rules" ? "How to Play" : "History";
  const roomMenu = (
    <CardBankRoomMenu
      bankingHistory={bankingHistory}
      onTabChange={setSidebarTab}
      selectedTab={sidebarTab}
    />
  );

  const updateExtraLives = (extraLivesEnabled: boolean) =>
    onUpdateSettings({ extraLivesEnabled });

  return (
    <RoomShell
      brand={<CardBankBrand />}
      connectionStatus={connectionStatus}
      currentPlayerId={currentPlayerId}
      message={message}
      onLeave={onLeave}
      onSendChatMessage={onSendChatMessage}
      room={room}
      roomMenu={roomMenu}
      roomMenuTitle={roomMenuTitle}
    >
      {room.phase === "waiting" ? (
        <CardBankLobby
          connectedPlayerCount={connectedPlayerCount}
          connectionStatus={connectionStatus}
          currentPlayerId={currentPlayerId}
          isHost={isHost}
          onRestart={onRestart}
          onStart={onStart}
          onUpdateSettings={updateExtraLives}
          room={room}
        />
      ) : (
        <CardBankGame
          connected={connected}
          currentPlayerId={currentPlayerId}
          onAction={onAction}
          onRestart={onRestart}
          room={room}
        />
      )}
    </RoomShell>
  );
}

function CardBankBrand() {
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

function CardBankRoomMenu({
  bankingHistory,
  onTabChange,
  selectedTab
}: {
  bankingHistory: ReturnType<typeof useBankingHistory>;
  onTabChange: (tab: "rules" | "history") => void;
  selectedTab: "rules" | "history";
}) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <div className="grid grid-cols-2 border-b border-cyan-200/15">
        <RoomMenuTab
          active={selectedTab === "rules"}
          label="How to Play"
          onClick={() => onTabChange("rules")}
        />
        <RoomMenuTab
          active={selectedTab === "history"}
          label="History"
          onClick={() => onTabChange("history")}
        />
      </div>
      <div className="themed-scrollbar min-h-0 overflow-y-auto p-4">
        {selectedTab === "rules" ? (
          <GameInstructions />
        ) : (
          <BankingHistory events={bankingHistory} />
        )}
      </div>
    </div>
  );
}

function RoomMenuTab({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
        active
          ? "border-b-2 border-emerald-400 text-emerald-300"
          : "text-slate-400 hover:text-slate-200"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function CardBankLobby({
  connectedPlayerCount,
  connectionStatus,
  currentPlayerId,
  isHost,
  onRestart,
  onStart,
  onUpdateSettings,
  room
}: {
  connectedPlayerCount: number;
  connectionStatus: ConnectionStatus;
  currentPlayerId: string;
  isHost: boolean;
  onRestart: () => Promise<string | null>;
  onStart: () => Promise<string | null>;
  onUpdateSettings: (extraLivesEnabled: boolean) => Promise<string | null>;
  room: PublicCardBankRoomState;
}) {
  return (
    <section className="grid content-start gap-5 rounded-md border border-cyan-200/15 bg-slate-950/45 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
      <div className="flex flex-wrap items-center gap-3">
        <ConnectionBadge status={connectionStatus} tone="dark" />
        <ShareButton roomCode={room.code} tone="dark" />
      </div>
      <PlayerList
        currentPlayerId={currentPlayerId}
        hostPlayerId={room.hostPlayerId}
        players={room.players}
      />
      <CardBankRuleToggle
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
    </section>
  );
}

function CardBankRuleToggle({
  room,
  isHost,
  onUpdateSettings
}: {
  room: PublicCardBankRoomState;
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
          checked={room.game.settings.extraLivesEnabled}
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
        <p className="text-xs text-slate-500">
          Only the host can change rules.
        </p>
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
  room: PublicCardBankRoomState;
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
          className="!border-emerald-300/50 !bg-emerald-600 !text-white shadow-[0_0_24px_rgba(16,185,129,0.2)] hover:!bg-emerald-500 disabled:!border-slate-700 disabled:!bg-slate-800 disabled:!text-slate-500"
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
          className="!border-emerald-300/50 !bg-emerald-600 !text-white shadow-[0_0_24px_rgba(16,185,129,0.2)] hover:!bg-emerald-500 disabled:!border-slate-700 disabled:!bg-slate-800 disabled:!text-slate-500"
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
