import {
  CARD_BANK_CARD_COLORS,
  CARD_BANK_CARD_VALUES,
  type CardBankCardCounts,
  type CardBankCardValue,
  type CardBankGameAction,
  type PublicCardBankGameState,
  type PublicPlayer,
  type PublicRoomState
} from "@multiplayer-blueprint/shared";
import { AlertTriangle, Play, Trophy, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../components/Button.js";

type PlayerLookup = Map<string, PublicPlayer>;

function getPlayerName(players: PlayerLookup, playerId: string): string {
  return players.get(playerId)?.displayName ?? "Unknown player";
}

function getCardTotal(cards: CardBankCardCounts): number {
  return CARD_BANK_CARD_VALUES.reduce((total, value) => total + cards[value], 0);
}

function getTextColor(value: CardBankCardValue): string {
  return value === 5 || value === 7 || value === 9 ? "#172033" : "#ffffff";
}

function formatPhase(
  gameState: PublicCardBankGameState,
  currentPlayerName: string
): string {
  if (gameState.status === "finished") {
    return "Finished";
  }

  switch (gameState.turnPhase) {
    case "awaiting-draw":
      return `${currentPlayerName} to draw`;
    case "awaiting-steal":
      return `${currentPlayerName} to steal`;
    case "awaiting-decision":
      return `${currentPlayerName} to decide`;
    case "revealing-bust":
      return `${currentPlayerName} busted`;
    case "finished":
      return "Finished";
  }
}

export function CardBankGame({
  room,
  currentPlayerId,
  connected,
  onAction
}: {
  room: PublicRoomState;
  currentPlayerId: string;
  connected: boolean;
  onAction: (action: CardBankGameAction) => Promise<string | null>;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<
    CardBankGameAction["type"] | null
  >(null);
  const gameState = room.gameState;
  const playerLookup = useMemo(
    () => new Map(room.players.map((player) => [player.id, player])),
    [room.players]
  );

  const runAction = async (action: CardBankGameAction) => {
    setSubmittingAction(action.type);
    setFeedback(null);
    const result = await onAction(action);
    setSubmittingAction(null);
    setFeedback(result);
  };

  if (room.phase === "waiting") {
    return (
      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">
          Card Banking
        </h2>
        <p className="text-sm text-slate-600">Waiting for the host to start.</p>
      </section>
    );
  }

  if (gameState === null) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-panel">
        Game state is loading.
      </section>
    );
  }

  const currentTurnPlayerId = gameState.currentPlayerId;
  const isCurrentTurn = currentTurnPlayerId === currentPlayerId;
  const currentTurnPlayerName =
    currentTurnPlayerId === null
      ? "No player"
      : getPlayerName(playerLookup, currentTurnPlayerId);
  const canDraw =
    connected &&
    isCurrentTurn &&
    (gameState.turnPhase === "awaiting-draw" ||
      gameState.turnPhase === "awaiting-decision");
  const canStop =
    connected && isCurrentTurn && gameState.turnPhase === "awaiting-decision";
  const canResolveSteal =
    connected && isCurrentTurn && gameState.turnPhase === "awaiting-steal";
  const drawLabel =
    gameState.turnPhase === "awaiting-decision" ? "Draw Again" : "Draw";

  return (
    <section className="grid gap-4">
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Card Banking
            </h2>
            <p className="text-sm text-slate-500">
              {formatPhase(gameState, currentTurnPlayerName)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-right text-sm">
            <Stat label="Deck" value={gameState.deckCount} />
            <Stat label="Discard" value={gameState.discardCount} />
          </div>
        </div>

        {gameState.pendingBust !== null ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-rose-950">
                <AlertTriangle size={16} />
                {getPlayerName(playerLookup, gameState.pendingBust.playerId)} busted
              </p>
              <p className="text-xs text-rose-800">
                Card {gameState.pendingBust.cardValue} caused the bust. Cards
                discard in a moment.
              </p>
            </div>
            <div
              className="grid h-16 w-12 place-items-center rounded-md border border-rose-400 text-center text-lg font-bold shadow-sm"
              style={{
                backgroundColor: CARD_BANK_CARD_COLORS[gameState.pendingBust.cardValue],
                color: getTextColor(gameState.pendingBust.cardValue)
              }}
            >
              {gameState.pendingBust.cardValue}
            </div>
          </div>
        ) : null}

        {gameState.pendingSteal !== null ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  Steal {gameState.pendingSteal.totalCount} card
                  {gameState.pendingSteal.totalCount === 1 ? "" : "s"} with
                  value {gameState.pendingSteal.drawnValue}
                </p>
                <p className="text-xs text-amber-800">
                  {gameState.pendingSteal.candidates
                    .map(
                      (candidate) =>
                        `${getPlayerName(playerLookup, candidate.playerId)} x${candidate.count}`
                    )
                    .join(", ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!canResolveSteal || submittingAction !== null}
                  onClick={() =>
                    void runAction({ type: "resolve-steal", steal: true })
                  }
                  type="button"
                  variant="primary"
                >
                  Steal
                </Button>
                <Button
                  disabled={!canResolveSteal || submittingAction !== null}
                  icon={<X size={16} />}
                  onClick={() =>
                    void runAction({ type: "resolve-steal", steal: false })
                  }
                  type="button"
                  variant="secondary"
                >
                  Decline
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {gameState.status === "playing" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              disabled={!canDraw || submittingAction !== null}
              icon={<Play size={16} />}
              onClick={() => void runAction({ type: "draw-card" })}
              type="button"
              variant={canDraw ? "primary" : "secondary"}
            >
              {drawLabel}
            </Button>
            <Button
              disabled={!canStop || submittingAction !== null}
              icon={<X size={16} />}
              onClick={() => void runAction({ type: "stop-turn" })}
              type="button"
              variant="secondary"
            >
              Stop
            </Button>
          </div>
        ) : null}

        {feedback !== null ? (
          <p className="mt-3 text-sm font-medium text-rose-700">{feedback}</p>
        ) : null}
      </div>

      {gameState.finalStandings !== null ? (
        <FinalStandings
          playerLookup={playerLookup}
          standings={gameState.finalStandings}
        />
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        {gameState.players.map((playerState) => (
          <PlayerArea
            isCurrentPlayer={playerState.playerId === currentPlayerId}
            isTurn={playerState.playerId === currentTurnPlayerId}
            key={playerState.playerId}
            name={getPlayerName(playerLookup, playerState.playerId)}
            pendingStealValue={
              gameState.pendingSteal?.candidates.some(
                (candidate) => candidate.playerId === playerState.playerId
              )
                ? gameState.pendingSteal.drawnValue
                : null
            }
            pendingBustValue={
              gameState.pendingBust?.playerId === playerState.playerId
                ? gameState.pendingBust.cardValue
                : null
            }
            player={playerState}
          />
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-100 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function PlayerArea({
  player,
  name,
  isCurrentPlayer,
  isTurn,
  pendingStealValue,
  pendingBustValue
}: {
  player: PublicCardBankGameState["players"][number];
  name: string;
  isCurrentPlayer: boolean;
  isTurn: boolean;
  pendingStealValue: CardBankCardValue | null;
  pendingBustValue: CardBankCardValue | null;
}) {
  return (
    <article
      className={`grid gap-3 rounded-md border bg-white p-4 shadow-panel ${
        isTurn ? "border-teal-400" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-950">
            {name}
            {isCurrentPlayer ? " (you)" : ""}
          </h3>
          <p className="text-xs font-medium text-slate-500">
            {isTurn ? "Current turn" : "Waiting"}
          </p>
        </div>
        <div className="rounded-md bg-slate-100 px-3 py-2 text-right">
          <p className="text-xs font-medium text-slate-500">Secured</p>
          <p className="font-semibold text-slate-950">{player.securedScore}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
          Active cards ({player.activeCount})
        </p>
        <CardCounts
          cards={player.activeCards}
          pendingBustValue={pendingBustValue}
          pendingStealValue={pendingStealValue}
        />
      </div>
    </article>
  );
}

function CardCounts({
  cards,
  pendingBustValue,
  pendingStealValue
}: {
  cards: CardBankCardCounts;
  pendingBustValue: CardBankCardValue | null;
  pendingStealValue: CardBankCardValue | null;
}) {
  if (getCardTotal(cards) === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
        No active cards
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {CARD_BANK_CARD_VALUES.map((value) =>
        cards[value] > 0 ? (
          <div
            className={`grid h-16 w-12 place-items-center rounded-md border text-center shadow-sm ${
              pendingBustValue === value
                ? "border-rose-500 ring-2 ring-rose-300"
                : pendingStealValue === value
                  ? "border-amber-500 ring-2 ring-amber-300"
                  : "border-black/10"
            }`}
            key={value}
            style={{
              backgroundColor: CARD_BANK_CARD_COLORS[value],
              color: getTextColor(value)
            }}
          >
            <div>
              <p className="text-lg font-bold leading-none">{value}</p>
              <p className="text-xs font-semibold leading-none">x{cards[value]}</p>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

function FinalStandings({
  standings,
  playerLookup
}: {
  standings: PublicCardBankGameState["finalStandings"];
  playerLookup: PlayerLookup;
}) {
  if (standings === null) {
    return null;
  }

  return (
    <section className="rounded-md border border-teal-200 bg-teal-50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal-950">
        <Trophy size={16} />
        Final standings
      </h3>
      <ol className="grid gap-2">
        {standings.map((standing) => (
          <li
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm"
            key={standing.playerId}
          >
            <span className="font-semibold text-slate-950">
              #{standing.rank} {getPlayerName(playerLookup, standing.playerId)}
            </span>
            <span className="text-slate-700">{standing.score} points</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
