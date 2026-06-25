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
import {
  AlertTriangle,
  Heart,
  Layers,
  Play,
  Trophy,
  X
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";

type PlayerLookup = Map<string, PublicPlayer>;
type PlayerState = PublicCardBankGameState["players"][number];

// A short-lived animation for cards leaving a player's active area: "secure"
// flies them toward the score counter, "bust" drops them and fades out.
type CardDeparture = {
  kind: "secure" | "bust";
  cards: CardBankCardCounts;
  token: number;
};

// Per-card stagger and the base single-card animation length. The overlay
// stays mounted for base + (cards * stagger) so the cascade finishes cleanly.
const CARD_DEPARTURE_STAGGER_MS = 45;
const CARD_DEPARTURE_BASE_MS = 600;

function getPlayerName(players: PlayerLookup, playerId: string): string {
  return players.get(playerId)?.displayName ?? "Unknown player";
}

function getCardTotal(cards: CardBankCardCounts): number {
  return CARD_BANK_CARD_VALUES.reduce((total, value) => total + cards[value], 0);
}

function getPhaseDetail(
  gameState: PublicCardBankGameState,
  currentPlayerName: string
): string {
  if (gameState.status === "finished") {
    return "Round complete";
  }

  switch (gameState.turnPhase) {
    case "awaiting-draw":
      return `${currentPlayerName} can draw from the deck.`;
    case "awaiting-steal":
      return `${currentPlayerName} is resolving a steal.`;
    case "awaiting-decision":
      return `${currentPlayerName} can draw again or stop.`;
    case "revealing-bust":
      return `${currentPlayerName} busted.`;
    case "finished":
      return "Round complete";
  }
}

function formatStealTarget(value: CardBankCardValue): string {
  return value === 1 ? "1s" : `${value}s`;
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

  // Track the previous active-card counts per player so we can flash a border
  // on cards that were just drawn or stolen. The extra-lives badge tracks its
  // own changes inside LivesBadge.
  const previousCardsRef = useRef<Map<string, CardBankCardCounts>>(new Map());
  // Track secured counts and the discard total so we can tell why a player's
  // active area emptied: banked (secured grew), busted (discard grew), or
  // stolen (neither — no animation).
  const previousSecuredRef = useRef<Map<string, number>>(new Map());
  const previousDiscardRef = useRef<number | null>(null);
  const [departures, setDepartures] = useState<Map<string, CardDeparture>>(
    new Map()
  );

  useEffect(() => {
    if (gameState === null) {
      return;
    }

    const previousCards = previousCardsRef.current;
    const previousSecured = previousSecuredRef.current;
    const previousDiscard = previousDiscardRef.current;

    const newDepartures: { playerId: string; departure: CardDeparture }[] = [];
    const nextCards = new Map<string, CardBankCardCounts>();
    const nextSecured = new Map<string, number>();

    for (const player of gameState.players) {
      const prevCards = previousCards.get(player.playerId);
      const prevActiveCount =
        prevCards === undefined ? 0 : getCardTotal(prevCards);
      const prevSecured = previousSecured.get(player.playerId);

      if (
        prevCards !== undefined &&
        prevActiveCount > 0 &&
        player.activeCount === 0
      ) {
        if (prevSecured !== undefined && player.securedCardCount > prevSecured) {
          newDepartures.push({
            playerId: player.playerId,
            departure: { kind: "secure", cards: prevCards, token: room.version }
          });
        } else if (
          previousDiscard !== null &&
          gameState.discardCount > previousDiscard
        ) {
          newDepartures.push({
            playerId: player.playerId,
            departure: { kind: "bust", cards: prevCards, token: room.version }
          });
        }
      }

      nextCards.set(player.playerId, player.activeCards);
      nextSecured.set(player.playerId, player.securedCardCount);
    }

    previousCardsRef.current = nextCards;
    previousSecuredRef.current = nextSecured;
    previousDiscardRef.current = gameState.discardCount;

    if (newDepartures.length === 0) {
      return;
    }

    setDepartures((current) => {
      const next = new Map(current);
      for (const item of newDepartures) {
        next.set(item.playerId, item.departure);
      }
      return next;
    });

    const tokensById = new Map(
      newDepartures.map((item) => [item.playerId, item.departure.token])
    );
    const maxCards = newDepartures.reduce(
      (most, item) => Math.max(most, getCardTotal(item.departure.cards)),
      0
    );
    window.setTimeout(() => {
      setDepartures((current) => {
        const next = new Map(current);
        for (const [playerId, token] of tokensById) {
          if (next.get(playerId)?.token === token) {
            next.delete(playerId);
          }
        }
        return next;
      });
    }, CARD_DEPARTURE_BASE_MS + maxCards * CARD_DEPARTURE_STAGGER_MS);
  }, [room.version, gameState]);

  const runAction = async (action: CardBankGameAction) => {
    setSubmittingAction(action.type);
    setFeedback(null);
    const result = await onAction(action);
    setSubmittingAction(null);
    setFeedback(result);
  };

  if (room.phase === "waiting") {
    return (
      <section className="grid min-h-[24rem] place-items-center rounded-md border border-cyan-200/15 bg-slate-950/45 p-5 text-center shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
        <div className="grid max-w-md gap-3">
          <p className="text-sm font-semibold uppercase text-emerald-300">
            Card Banking
          </p>
          <h2 className="text-2xl font-bold text-slate-100">
            Waiting for the host to start
          </h2>
          <p className="text-sm leading-6 text-slate-400">
            Players can join, chat, and get ready while the host starts the
            room.
          </p>
        </div>
      </section>
    );
  }

  if (gameState === null) {
    return (
      <section className="rounded-md border border-cyan-200/15 bg-slate-950/45 p-4 text-sm text-slate-300 shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
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
  const currentPlayerState =
    gameState.players.find((player) => player.playerId === currentPlayerId) ??
    null;
  const opponentStates =
    currentPlayerState === null
      ? gameState.players
      : gameState.players.filter((player) => player.playerId !== currentPlayerId);
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
  const turnLabel =
    gameState.status === "finished"
      ? "Game Complete"
      : isCurrentTurn
        ? "Your Turn"
        : `${currentTurnPlayerName}'s Turn`;

  return (
    <section className="grid min-w-0 content-start gap-2">
      <TurnBadge
        detail={getPhaseDetail(gameState, currentTurnPlayerName)}
        isCurrentTurn={isCurrentTurn}
        label={turnLabel}
      />

      {gameState.finalStandings !== null ? (
        <FinalStandings
          playerLookup={playerLookup}
          standings={gameState.finalStandings}
        />
      ) : null}

      {opponentStates.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {opponentStates.map((playerState) => (
            <PlayerArea
              isCurrentPlayer={playerState.playerId === currentPlayerId}
              isTurn={playerState.playerId === currentTurnPlayerId}
              key={playerState.playerId}
              name={getPlayerName(playerLookup, playerState.playerId)}
              pendingBustValue={
                gameState.pendingBust?.playerId === playerState.playerId
                  ? gameState.pendingBust.cardValue
                  : null
              }
              pendingStealValue={
                gameState.pendingSteal?.candidates.some(
                  (candidate) => candidate.playerId === playerState.playerId
                )
                  ? gameState.pendingSteal.drawnValue
                  : null
              }
              departure={departures.get(playerState.playerId) ?? null}
              player={playerState}
              previousCards={
                previousCardsRef.current.get(playerState.playerId) ?? null
              }
              variant="opponent"
            />
          ))}
        </div>
      ) : null}

      <section className="grid gap-2 lg:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)] lg:items-stretch">
        <DeckDiscard
          deckCount={gameState.deckCount}
          discardCount={gameState.discardCount}
        />

        {gameState.pendingSteal !== null ? (
          <PendingStealPrompt
            canResolveSteal={canResolveSteal}
            onResolve={(steal) =>
              void runAction({ type: "resolve-steal", steal })
            }
            pendingSteal={gameState.pendingSteal}
            playerLookup={playerLookup}
            submittingAction={submittingAction}
          />
        ) : (
          <TurnActionPanel
            bustReveal={
              gameState.pendingBust === null
                ? null
                : {
                    name: getPlayerName(
                      playerLookup,
                      gameState.pendingBust.playerId
                    ),
                    value: gameState.pendingBust.cardValue
                  }
            }
            canDraw={canDraw}
            canStop={canStop}
            currentTurnPlayerName={currentTurnPlayerName}
            drawLabel={drawLabel}
            gameState={gameState}
            isCurrentTurn={isCurrentTurn}
            onDraw={() => void runAction({ type: "draw-card" })}
            onStop={() => void runAction({ type: "stop-turn" })}
            submittingAction={submittingAction}
          />
        )}
      </section>

      {feedback !== null ? (
        <p className="rounded-md border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200">
          {feedback}
        </p>
      ) : null}

      {currentPlayerState !== null ? (
        <PlayerArea
          isCurrentPlayer
          isTurn={currentPlayerState.playerId === currentTurnPlayerId}
          name={getPlayerName(playerLookup, currentPlayerState.playerId)}
          pendingBustValue={
            gameState.pendingBust?.playerId === currentPlayerState.playerId
              ? gameState.pendingBust.cardValue
              : null
          }
          pendingStealValue={null}
          departure={departures.get(currentPlayerState.playerId) ?? null}
          player={currentPlayerState}
          previousCards={
            previousCardsRef.current.get(currentPlayerState.playerId) ?? null
          }
          variant="current"
        />
      ) : null}
    </section>
  );
}

function TurnBadge({
  label,
  detail,
  isCurrentTurn
}: {
  label: string;
  detail: string;
  isCurrentTurn: boolean;
}) {
  return (
    <div className="grid content-start justify-items-center gap-1 self-start">
      <div
        className={`inline-flex items-center gap-3 whitespace-nowrap rounded-full border px-5 py-2 text-sm font-extrabold uppercase leading-none tracking-wide lg:h-8 lg:gap-2 lg:px-4 lg:py-0 lg:text-xs ${
          isCurrentTurn
            ? "border-emerald-400/55 bg-emerald-500/10 text-emerald-300 shadow-[0_0_32px_rgba(16,185,129,0.24)]"
            : "border-cyan-300/25 bg-slate-950/50 text-cyan-200"
        }`}
      >
        <span
          className={`h-3 w-3 rounded-full lg:h-2.5 lg:w-2.5 ${
            isCurrentTurn ? "bg-emerald-400" : "bg-cyan-300"
          }`}
        />
        <span className="leading-none">{label}</span>
      </div>
      <p className="text-center text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function DeckDiscard({
  deckCount,
  discardCount
}: {
  deckCount: number;
  discardCount: number;
}) {
  return (
    <>
      <div className="grid grid-cols-2 items-center gap-3 rounded-md border border-cyan-200/15 bg-slate-950/45 px-3 py-2 sm:hidden">
        <CompactPileStat
          count={deckCount}
          icon={<CompactDeckIcon />}
          label="Deck"
        />
        <CompactPileStat
          count={discardCount}
          icon={<CompactEmptyDiscardIcon />}
          label="Discard"
        />
      </div>

      <div className="hidden grid-cols-2 justify-center gap-3 sm:grid">
        <PileFrame label="Deck" value={deckCount}>
          <CardBack />
        </PileFrame>
        <PileFrame label="Discard" value={discardCount}>
          <div className="grid h-16 w-11 place-items-center rounded-md border-2 border-dashed border-cyan-200/25 bg-slate-900/75 text-center text-xs font-semibold uppercase text-slate-500 sm:h-28 sm:w-20">
            <Layers size={18} />
          </div>
        </PileFrame>
      </div>
    </>
  );
}

function CompactPileStat({
  count,
  icon,
  label
}: {
  count: number;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-2">
      {icon}
      <span className="ml-1 truncate font-semibold text-slate-300">
        {label}
      </span>
      <span className="font-bold leading-none text-slate-100">
        {count}
      </span>
    </div>
  );
}

function CompactDeckIcon() {
  return (
    <div className="relative h-7 w-5 shrink-0">
      <div className="absolute left-0.5 top-0.5 h-full w-full rounded border border-cyan-200/20 bg-slate-900" />
      <div className="absolute inset-0 grid place-items-center rounded border border-slate-300/80 bg-[#102742]">
        <Layers className="text-cyan-100/45" size={13} />
      </div>
    </div>
  );
}

function CompactEmptyDiscardIcon() {
  return (
    <div className="grid h-7 w-5 shrink-0 place-items-center rounded border border-dashed border-cyan-200/30 bg-slate-900/75">
      <Layers className="text-cyan-100/45" size={13} />
    </div>
  );
}

function PileFrame({
  children,
  label,
  value
}: {
  children: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="grid justify-items-center gap-1 rounded-md border border-cyan-200/15 bg-slate-950/45 px-2 py-2 text-center sm:gap-2 sm:px-3 sm:py-3">
      {children}
      <div>
        <p className="text-xs font-medium text-slate-300 sm:text-sm">{label}</p>
        <p className="text-xl font-extrabold leading-6 text-slate-100 sm:text-2xl sm:leading-7">
          {value}
        </p>
      </div>
    </div>
  );
}

function CardBack() {
  return (
    <div className="relative h-16 w-11 sm:h-28 sm:w-20">
      <div className="absolute left-1 top-1 h-full w-full rounded-md border border-cyan-200/20 bg-slate-900" />
      <div className="absolute inset-0 rounded-md border-2 border-slate-300/80 bg-[#102742] p-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.3)] sm:p-2">
        <div className="grid h-full place-items-center rounded border border-cyan-100/20">
          <Layers className="text-cyan-100/45" size={20} />
        </div>
      </div>
    </div>
  );
}

function PendingStealPrompt({
  pendingSteal,
  playerLookup,
  canResolveSteal,
  submittingAction,
  onResolve
}: {
  pendingSteal: NonNullable<PublicCardBankGameState["pendingSteal"]>;
  playerLookup: PlayerLookup;
  canResolveSteal: boolean;
  submittingAction: CardBankGameAction["type"] | null;
  onResolve: (steal: boolean) => void;
}) {
  const candidateText = pendingSteal.candidates
    .map(
      (candidate) =>
        `${getPlayerName(playerLookup, candidate.playerId)} x${candidate.count}`
    )
    .join(", ");

  return (
    <div className="grid content-center gap-3 rounded-md border border-sky-400/45 bg-sky-950/35 p-2 text-center shadow-[0_0_34px_rgba(56,189,248,0.16)]">
      <div>
        <p className="hidden text-lg font-extrabold text-slate-100 sm:block">
          You drew a{" "}
          <span className="text-amber-200">{pendingSteal.drawnValue}</span>.
        </p>
        <p className="text-lg font-extrabold text-slate-100">
          Steal all matching {formatStealTarget(pendingSteal.drawnValue)}?
        </p>
      </div>
      <div className="grid gap-2 grid-cols-2">
        <GameButton
          disabled={!canResolveSteal || submittingAction !== null}
          onClick={() => onResolve(true)}
          tone="info"
        >
          Steal {pendingSteal.totalCount}{" "}
          {pendingSteal.totalCount === 1 ? "Card" : "Cards"}
        </GameButton>
        <GameButton
          disabled={!canResolveSteal || submittingAction !== null}
          onClick={() => onResolve(false)}
          tone="secondary"
        >
          Decline
        </GameButton>
      </div>
      <p className="hidden text-xs leading-5 text-slate-400 sm:block">
        Matching cards available: {candidateText}
      </p>
    </div>
  );
}

function TurnActionPanel({
  gameState,
  isCurrentTurn,
  currentTurnPlayerName,
  drawLabel,
  canDraw,
  canStop,
  submittingAction,
  bustReveal,
  onDraw,
  onStop
}: {
  gameState: PublicCardBankGameState;
  isCurrentTurn: boolean;
  currentTurnPlayerName: string;
  drawLabel: string;
  canDraw: boolean;
  canStop: boolean;
  submittingAction: CardBankGameAction["type"] | null;
  bustReveal: { name: string; value: CardBankCardValue } | null;
  onDraw: () => void;
  onStop: () => void;
}) {
  const isPlayable = gameState.status === "playing";

  // While a bust is being revealed, take over the action panel with the bust
  // message so it reads in place instead of pushing the rest of the board down.
  if (bustReveal !== null) {
    return (
      <div className="grid content-center gap-3 rounded-md border border-rose-300/40 bg-rose-500/10 p-2 lg:p-4">
        <BustNotice name={bustReveal.name} value={bustReveal.value} />
      </div>
    );
  }

  return (
    <div className="grid content-center gap-3 rounded-md border border-cyan-200/15 bg-slate-950/45 p-2 lg:p-4">
      <div>
        <p className="text-lg font-bold text-slate-100">
          {isPlayable
            ? isCurrentTurn
              ? "Choose your move"
              : `Waiting for ${currentTurnPlayerName}`
            : "Round complete"}
        </p>
      </div>

      {isPlayable ? (
        <div className="grid grid-cols-2 gap-2">
          <GameButton
            disabled={!canDraw || submittingAction !== null}
            icon={<Play size={16} />}
            onClick={onDraw}
            tone="primary"
          >
            {drawLabel}
          </GameButton>
          <GameButton
            disabled={!canStop || submittingAction !== null}
            icon={<X size={16} />}
            onClick={onStop}
            tone="secondary"
          >
            Stop
          </GameButton>
        </div>
      ) : null}
    </div>
  );
}

function GameButton({
  children,
  disabled,
  icon,
  onClick,
  tone
}: {
  children: ReactNode;
  disabled: boolean;
  icon?: React.ReactNode;
  onClick: () => void;
  tone: "primary" | "secondary" | "info";
}) {
  const toneClass =
    tone === "primary"
      ? "border-emerald-300/50 bg-emerald-600 text-white shadow-[0_0_24px_rgba(16,185,129,0.2)] hover:bg-emerald-500"
      : tone === "info"
        ? "border-sky-300/50 bg-sky-600 text-white shadow-[0_0_24px_rgba(56,189,248,0.2)] hover:bg-sky-500"
        : "border-cyan-200/20 bg-slate-900/85 text-slate-100 hover:bg-slate-800";

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-2 py-2 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 sm:px-4 ${toneClass} whitespace-nowrap`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function BustNotice({
  name,
  value
}: {
  name: string;
  value: CardBankCardValue;
}) {
  return (
    <div className="flex items-center justify-around">
      <div className="w-12 shrink-0">
        <CardTile highlighted size="small" value={value} />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-extrabold text-rose-100">
          <AlertTriangle size={16} />
          {name} busted
        </p>
        <p className="mt-1 text-xs leading-5 text-rose-200/80">
          Card {value} caused the bust. Discarding in a moment.
        </p>
      </div>
    </div>
  );
}

// Renders the extra-lives badge and owns its own animations: a border flash
// whenever the count changes, and a pop-and-fade when the last life is spent
// (kept mounted briefly so the exit can play before it is removed).
function LivesBadge({ extraLives }: { extraLives: number }) {
  const previousRef = useRef(extraLives);
  const [enterToken, setEnterToken] = useState(0);
  const [leaving, setLeaving] = useState<{ value: number; token: number } | null>(
    null
  );

  useLayoutEffect(() => {
    const previous = previousRef.current;
    if (previous === extraLives) {
      return;
    }
    previousRef.current = extraLives;

    if (extraLives > 0) {
      setEnterToken((token) => token + 1);
      setLeaving(null);
    } else if (previous > 0) {
      setLeaving((current) => ({
        value: previous,
        token: (current?.token ?? 0) + 1
      }));
    }
  }, [extraLives]);

  useEffect(() => {
    if (leaving === null) {
      return;
    }
    const timer = window.setTimeout(() => setLeaving(null), 520);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (extraLives > 0) {
    return (
      <LivesPill
        animationClass={enterToken === 0 ? "" : "cb-lives-flash"}
        key={`flash-${enterToken}`}
        value={extraLives}
      />
    );
  }

  if (leaving !== null) {
    return (
      <LivesPill
        animationClass="cb-lives-leave"
        key={`leave-${leaving.token}`}
        value={leaving.value}
      />
    );
  }

  return null;
}

function LivesPill({
  value,
  animationClass
}: {
  value: number;
  animationClass: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-md border border-rose-300/30 bg-rose-950/40 px-2 ${animationClass}`}
      title={`${value} extra ${value === 1 ? "life" : "lives"}`}
    >
      <Heart aria-hidden className="h-3 w-3 fill-rose-400 text-rose-400" />
      <span className="text-xs font-extrabold leading-6 text-rose-200">
        {value}
      </span>
    </div>
  );
}

function PlayerArea({
  player,
  name,
  isCurrentPlayer,
  isTurn,
  pendingStealValue,
  pendingBustValue,
  previousCards,
  departure,
  variant
}: {
  player: PlayerState;
  name: string;
  isCurrentPlayer: boolean;
  isTurn: boolean;
  pendingStealValue: CardBankCardValue | null;
  pendingBustValue: CardBankCardValue | null;
  previousCards: CardBankCardCounts | null;
  departure: CardDeparture | null;
  variant: "opponent" | "current";
}) {
  const isCurrentArea = variant === "current";
  const cardSize = isCurrentArea ? "large" : "small";

  return (
    <article
      className={`grid gap-1 rounded-md border p-2 shadow-[0_20px_70px_rgba(0,0,0,0.18)] ${
        isTurn
          ? "border-emerald-400/55 bg-emerald-950/25"
          : "border-cyan-200/15 bg-slate-950/45"
      } ${isCurrentArea ? "sm:p-4" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={`truncate font-extrabold text-slate-100 ${
              isCurrentArea ? "text-lg" : "text-base"
            }`}
          >
            {isCurrentPlayer ? "You" : name}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <LivesBadge extraLives={player.extraLives} />
          <div className="rounded-md border border-cyan-300/20 bg-slate-950/65 px-3 text-right">
            <p className="text-xs font-extrabold leading-6 text-sky-300">
              {player.securedCardCount}
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <CardGrid
          cards={player.activeCards}
          previousCards={previousCards}
          pendingBustValue={pendingBustValue}
          pendingStealValue={pendingStealValue}
          size={cardSize}
        />
        {departure !== null ? (
          <CardDepartureOverlay
            cards={departure.cards}
            key={departure.token}
            kind={departure.kind}
            size={cardSize}
          />
        ) : null}
      </div>
    </article>
  );
}

function CardDepartureOverlay({
  cards,
  kind,
  size
}: {
  cards: CardBankCardCounts;
  kind: CardDeparture["kind"];
  size: "small" | "large";
}) {
  const animationClass = kind === "secure" ? "cb-secure-fly" : "cb-bust-fall";
  let cardIndex = 0;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className={
          size === "large"
            ? "grid grid-cols-5 justify-items-center gap-2 2xl:grid-cols-10"
            : "grid grid-cols-5 justify-items-center gap-1"
        }
      >
        {CARD_BANK_CARD_VALUES.flatMap((value) =>
          Array.from({ length: cards[value] }, (_, occurrence) => {
            const index = cardIndex;
            cardIndex += 1;
            const style: CSSProperties = {
              animationDelay: `${index * CARD_DEPARTURE_STAGGER_MS}ms`
            };
            if (kind === "bust") {
              const direction = index % 2 === 0 ? 1 : -1;
              (style as Record<string, string>)["--cb-rot"] =
                `${direction * (10 + (index % 3) * 7)}deg`;
              (style as Record<string, string>)["--cb-drift"] =
                `${direction * (12 + (index % 4) * 8)}%`;
            }

            return (
              <CardTile
                className={animationClass}
                key={`${value}-${occurrence}`}
                size={size}
                style={style}
                value={value}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function CardGrid({
  cards,
  previousCards,
  pendingBustValue,
  pendingStealValue,
  size
}: {
  cards: CardBankCardCounts;
  previousCards: CardBankCardCounts | null;
  pendingBustValue: CardBankCardValue | null;
  pendingStealValue: CardBankCardValue | null;
  size: "small" | "large";
}) {
  const total = getCardTotal(cards);

  if (total === 0) {
    return (
      <div className="grid min-h-24 place-items-center rounded-md border border-dashed border-cyan-200/20 px-3 py-4 text-center text-sm text-slate-500">
        No active cards
      </div>
    );
  }

  return (
    <div
      className={
        size === "large"
          ? "grid grid-cols-5 justify-items-center gap-2 2xl:grid-cols-10"
          : "grid grid-cols-5 justify-items-center gap-1"
      }
    >
      {CARD_BANK_CARD_VALUES.flatMap((value) => {
        const count = cards[value];
        // Without a prior snapshot (first render) treat every card as old so
        // the board does not flash on initial load.
        const previousCount = previousCards === null ? count : previousCards[value];
        return Array.from({ length: count }, (_, occurrence) => (
          <CardTile
            flash={occurrence >= previousCount}
            highlighted={
              pendingBustValue === value || pendingStealValue === value
            }
            key={`${value}-${occurrence}`}
            size={size}
            value={value}
          />
        ));
      })}
    </div>
  );
}

function CardTile({
  value,
  highlighted = false,
  flash = false,
  size,
  className = "",
  style
}: {
  value: CardBankCardValue;
  highlighted?: boolean;
  flash?: boolean;
  size: "small" | "large" | "pile";
  className?: string;
  style?: CSSProperties;
}) {
  const isLarge = size === "large";
  const isPile = size === "pile";
  const tileSizeClass = isPile
    ? "h-16 w-11 sm:h-28 sm:w-20"
    : isLarge
      ? "aspect-[5/7] w-full max-w-20"
      : "aspect-[5/7] w-12 sm:w-14 lg:w-[3.25rem] xl:w-14";
  const centerSize =
    size === "small"
      ? value === 10
        ? "text-xl"
        : "text-2xl"
      : value === 10
        ? "text-4xl"
        : "text-5xl";

  return (
    <div
      className={`relative grid place-items-center overflow-hidden rounded-md border-2 border-white/80 shadow-[0_8px_18px_rgba(0,0,0,0.25)] ${
        tileSizeClass
      } ${highlighted ? "ring-2 ring-emerald-300" : ""} ${
        flash ? "cb-card-flash" : ""
      } ${className}`}
      style={{
        backgroundColor: CARD_BANK_CARD_COLORS[value],
        color: "#ffffff",
        textShadow: "0 2px 0 rgba(0,0,0,0.24)",
        ...style
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_45%,rgba(0,0,0,0.12))]" />
      <span
        className={`absolute left-1.5 top-1 font-bold leading-none ${
          isLarge || isPile ? "text-sm" : "text-xs"
        }`}
      >
        {value}
      </span>
      <span className={`relative font-serif font-black leading-none ${centerSize}`}>
        {value}
      </span>
      <span
        className={`absolute bottom-1 right-1.5 font-bold leading-none ${
          isLarge || isPile ? "text-sm" : "text-xs"
        }`}
      >
        {value}
      </span>
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
    <section className="rounded-md border border-emerald-300/35 bg-emerald-950/25 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase text-emerald-200">
        <Trophy size={16} />
        Final Standings
      </h3>
      <ol className="grid gap-2">
        {standings.map((standing) => (
          <li
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-cyan-200/10 bg-slate-950/50 px-3 py-2 text-sm"
            key={standing.playerId}
          >
            <span className="font-semibold text-slate-100">
              #{standing.rank} {getPlayerName(playerLookup, standing.playerId)}
            </span>
            <span className="text-sky-300">{standing.score} points</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
