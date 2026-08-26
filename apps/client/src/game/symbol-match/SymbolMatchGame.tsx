import {
  SYMBOL_MATCH_CORRECT_FEEDBACK_MS,
  SYMBOL_MATCH_RECONNECT_GRACE_MS,
  SYMBOL_MATCH_START_COUNTDOWN_MS,
  SYMBOL_MATCH_WRONG_FEEDBACK_MS,
  SYMBOL_MATCH_WRONG_REPEAT_WINDOW_MS,
  type PublicPlayer,
  type PublicSymbolMatchCard,
  type PublicSymbolMatchChallenge,
  type PublicSymbolMatchGameState,
  type PublicSymbolMatchRoomState,
  type PublicSymbolMatchWrongFeedback,
  type SymbolMatchGameAction,
  type SymbolMatchSymbolId
} from "@multiplayer-blueprint/shared";
import { X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";
import { getSymbolMatchSymbol } from "./symbolCatalog.js";
import "./symbolMatch.css";

type SymbolMatchBoardStyle = CSSProperties & {
  "--sm-correct-feedback-ms": string;
  "--sm-countdown-ms": string;
  "--sm-reconnect-grace-ms": string;
  "--sm-wrong-feedback-ms": string;
};

type SymbolPlacementStyle = CSSProperties & {
  "--sm-symbol-left": string;
  "--sm-symbol-rotation": string;
  "--sm-symbol-scale": number;
  "--sm-symbol-top": string;
};

type FeedbackStyle = CSSProperties & {
  "--sm-feedback-duration": string;
};

type StarStyle = CSSProperties & {
  "--sm-star-angle": string;
  "--sm-star-delay": string;
};

const STAR_COUNT = 9;

export function SymbolMatchGame({
  connected,
  currentPlayerId,
  onAction,
  room
}: {
  connected: boolean;
  currentPlayerId: string;
  onAction: (action: SymbolMatchGameAction) => Promise<string | null>;
  room: PublicSymbolMatchRoomState;
}) {
  const gameState = room.game.state;
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const recentLocalSelections = useRef(new Map<string, number>());
  const challenge = getVisibleChallenge(gameState);
  const timedState =
    gameState?.status === "countdown" || gameState?.status === "paused";
  const now = useAuthoritativeDisplayClock(timedState);
  const playerLookup = useMemo(
    () => new Map(room.players.map((player) => [player.id, player])),
    [room.players]
  );
  const currentPlayer = playerLookup.get(currentPlayerId);
  const opponent = room.players.find((player) => player.id !== currentPlayerId);
  const ownCard = challenge?.cards.find(
    (card) => card.assignedPlayerId === currentPlayerId
  );
  const opponentCard = challenge?.cards.find(
    (card) => card.assignedPlayerId !== currentPlayerId
  );
  const isChallengeOpen = gameState?.status === "challenge-open";
  const correctSymbolId =
    gameState?.status === "challenge-feedback"
      ? gameState.correctFeedback.symbolId
      : null;
  const selectedCorrectCardId =
    gameState?.status === "challenge-feedback"
      ? gameState.correctFeedback.selectedCardId
      : null;
  const correctFeedbackExpiresAt =
    gameState?.status === "challenge-feedback"
      ? gameState.correctFeedback.expiresAt
      : null;
  const wrongFeedback = getWrongFeedback(gameState);
  const boardStyle: SymbolMatchBoardStyle = {
    "--sm-correct-feedback-ms": `${SYMBOL_MATCH_CORRECT_FEEDBACK_MS}ms`,
    "--sm-countdown-ms": `${SYMBOL_MATCH_START_COUNTDOWN_MS}ms`,
    "--sm-reconnect-grace-ms": `${SYMBOL_MATCH_RECONNECT_GRACE_MS}ms`,
    "--sm-wrong-feedback-ms": `${SYMBOL_MATCH_WRONG_FEEDBACK_MS}ms`
  };

  useEffect(() => {
    setActionMessage(null);
    recentLocalSelections.current.clear();
  }, [challenge?.challengeId, gameState?.status]);

  const selectSymbol = async (symbolId: SymbolMatchSymbolId) => {
    if (!connected || !isChallengeOpen || challenge === null) {
      return;
    }

    const selectionKey = `${challenge.challengeId}:${symbolId}`;
    const selectedAt = Date.now();
    const previousSelectionAt = recentLocalSelections.current.get(selectionKey);
    if (
      previousSelectionAt !== undefined &&
      selectedAt - previousSelectionAt < SYMBOL_MATCH_WRONG_REPEAT_WINDOW_MS
    ) {
      return;
    }
    recentLocalSelections.current.set(selectionKey, selectedAt);
    setActionMessage(null);

    const message = await onAction({
      type: "select-symbol",
      challengeId: challenge.challengeId,
      symbolId
    });
    setActionMessage(message);
  };

  if (gameState === null) {
    return (
      <section className="sm-game-board sm-game-board--loading">
        <p role="status">Preparing the match…</p>
      </section>
    );
  }

  return (
    <section
      aria-busy={!isChallengeOpen}
      aria-label="Symbol Match game board"
      className={`sm-game-board sm-game-board--${gameState.status}`}
      style={boardStyle}
    >
      <SymbolCard
        card={opponentCard ?? null}
        cardOwnerLabel={`${opponent?.displayName ?? "Opponent"}'s card`}
        correctFeedbackExpiresAt={correctFeedbackExpiresAt}
        correctSymbolId={correctSymbolId}
        interactive={false}
        onSelect={selectSymbol}
        selectedCorrectCardId={selectedCorrectCardId}
        wrongFeedback={wrongFeedback}
      />

      <BoardStatus
        currentPlayer={currentPlayer}
        currentPlayerId={currentPlayerId}
        gameState={gameState}
        now={now}
        opponent={opponent}
        playerLookup={playerLookup}
      />

      <SymbolCard
        card={ownCard ?? null}
        cardOwnerLabel="Your card"
        correctFeedbackExpiresAt={correctFeedbackExpiresAt}
        correctSymbolId={correctSymbolId}
        interactive={connected && isChallengeOpen}
        onSelect={selectSymbol}
        selectedCorrectCardId={selectedCorrectCardId}
        wrongFeedback={wrongFeedback}
      />

      <p
        aria-live="polite"
        className={`sm-game-board__action-message ${
          actionMessage === null ? "sm-game-board__action-message--empty" : ""
        }`}
        role="status"
      >
        {actionMessage ?? "No selection error"}
      </p>
    </section>
  );
}

function SymbolCard({
  card,
  cardOwnerLabel,
  correctFeedbackExpiresAt,
  correctSymbolId,
  interactive,
  onSelect,
  selectedCorrectCardId,
  wrongFeedback
}: {
  card: PublicSymbolMatchCard | null;
  cardOwnerLabel: string;
  correctFeedbackExpiresAt: number | null;
  correctSymbolId: SymbolMatchSymbolId | null;
  interactive: boolean;
  onSelect: (symbolId: SymbolMatchSymbolId) => Promise<void>;
  selectedCorrectCardId: number | null;
  wrongFeedback: PublicSymbolMatchWrongFeedback[];
}) {
  const cardStyle: CSSProperties | undefined =
    card === null
      ? undefined
      : { transform: `rotate(${card.wholeRotationDegrees}deg)` };

  return (
    <figure className="sm-card-wrap">
      <figcaption className="sm-card-wrap__label">{cardOwnerLabel}</figcaption>
      <div
        aria-label={
          card === null
            ? `${cardOwnerLabel}, symbols hidden`
            : `${cardOwnerLabel}, eight symbols`
        }
        className={`sm-card ${card === null ? "sm-card--blank" : ""}`}
        role="group"
      >
        {card === null ? (
          <span aria-hidden="true" />
        ) : (
          <div className="sm-card__content" style={cardStyle}>
            {card.printedSymbols.map((printedSymbol) => {
              const definition = getSymbolMatchSymbol(printedSymbol.symbolId);
              const mistakes = wrongFeedback.filter(
                (feedback) =>
                  feedback.selectedCardId === card.cardId &&
                  feedback.symbolId === printedSymbol.symbolId
              );
              const isCorrectMatch = correctSymbolId === printedSymbol.symbolId;
              const showStars =
                isCorrectMatch && selectedCorrectCardId === card.cardId;
              const placementStyle: SymbolPlacementStyle = {
                "--sm-symbol-left": `${printedSymbol.x * 100}%`,
                "--sm-symbol-rotation": `${printedSymbol.rotationDegrees}deg`,
                "--sm-symbol-scale": printedSymbol.scale,
                "--sm-symbol-top": `${printedSymbol.y * 100}%`
              };
              const symbolClassName = [
                "sm-symbol",
                correctSymbolId !== null && !isCorrectMatch
                  ? "sm-symbol--muted"
                  : "",
                isCorrectMatch ? "sm-symbol--match" : ""
              ]
                .filter(Boolean)
                .join(" ");
              const contents = (
                <>
                  <img
                    alt=""
                    className="sm-symbol__image"
                    draggable={false}
                    src={definition.assetUrl}
                  />
                  {mistakes.map((feedback) => (
                    <WrongFeedback
                      feedback={feedback}
                      key={feedback.attemptId}
                    />
                  ))}
                  {showStars && correctFeedbackExpiresAt !== null ? (
                    <SuccessStars expiresAt={correctFeedbackExpiresAt} />
                  ) : null}
                </>
              );

              return interactive ? (
                <button
                  aria-label={`Select ${definition.label} on your card`}
                  className={symbolClassName}
                  key={printedSymbol.symbolId}
                  onClick={() => void onSelect(printedSymbol.symbolId)}
                  style={placementStyle}
                  type="button"
                >
                  {contents}
                </button>
              ) : (
                <div
                  aria-label={definition.label}
                  className={symbolClassName}
                  key={printedSymbol.symbolId}
                  role="img"
                  style={placementStyle}
                >
                  {contents}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </figure>
  );
}

function WrongFeedback({
  feedback
}: {
  feedback: PublicSymbolMatchWrongFeedback;
}) {
  const remainingMs = Math.max(feedback.expiresAt - Date.now(), 1);
  const style: FeedbackStyle = {
    "--sm-feedback-duration": `${remainingMs}ms`
  };

  return (
    <span aria-hidden="true" className="sm-wrong-feedback" style={style}>
      <X strokeWidth={4} />
    </span>
  );
}

function SuccessStars({ expiresAt }: { expiresAt: number }) {
  const style: FeedbackStyle = {
    "--sm-feedback-duration": `${Math.max(expiresAt - Date.now(), 1)}ms`
  };

  return (
    <span aria-hidden="true" className="sm-success-stars" style={style}>
      {Array.from({ length: STAR_COUNT }, (_, index) => {
        const style: StarStyle = {
          "--sm-star-angle": `${(360 / STAR_COUNT) * index}deg`,
          "--sm-star-delay": `${index * 32}ms`
        };
        return (
          <span className="sm-success-stars__star" key={index} style={style}>
            ★
          </span>
        );
      })}
    </span>
  );
}

function BoardStatus({
  currentPlayer,
  currentPlayerId,
  gameState,
  now,
  opponent,
  playerLookup
}: {
  currentPlayer: PublicPlayer | undefined;
  currentPlayerId: string;
  gameState: PublicSymbolMatchGameState;
  now: number;
  opponent: PublicPlayer | undefined;
  playerLookup: Map<string, PublicPlayer>;
}) {
  const currentScore = getScore(gameState, currentPlayerId);
  const opponentScore = getScore(gameState, opponent?.id);
  const presentation = getStatusPresentation(
    gameState,
    now,
    currentPlayerId,
    playerLookup
  );

  return (
    <div className="sm-board-status">
      <div
        aria-atomic="true"
        aria-live="polite"
        className="sm-scoreboard"
        role="status"
      >
        <span
          className="sm-scoreboard__name"
          title={currentPlayer?.displayName}
        >
          You
        </span>
        <strong className="sm-scoreboard__score">{currentScore}</strong>
        <span aria-hidden="true" className="sm-scoreboard__divider">
          •
        </span>
        <strong className="sm-scoreboard__score sm-scoreboard__score--opponent">
          {opponentScore}
        </strong>
        <span
          className="sm-scoreboard__name sm-scoreboard__name--opponent"
          title={opponent?.displayName}
        >
          {opponent?.displayName ?? "Opponent"}
        </span>
      </div>
      <div aria-atomic="true" aria-live="polite" className="sm-status-copy">
        <strong key={presentation.key} className="sm-status-copy__title">
          {presentation.title}
        </strong>
        <span className="sm-status-copy__detail">{presentation.detail}</span>
      </div>
    </div>
  );
}

function getStatusPresentation(
  state: PublicSymbolMatchGameState,
  now: number,
  currentPlayerId: string,
  playerLookup: Map<string, PublicPlayer>
): { key: string; title: string; detail: string } {
  switch (state.status) {
    case "countdown": {
      const remaining = Math.max(
        1,
        Math.ceil((state.countdownEndsAt - now) / 1000)
      );
      return {
        key: `countdown-${remaining}`,
        title: `${remaining}`,
        detail: "Get ready to find the shared symbol"
      };
    }
    case "challenge-open":
      return {
        key: state.challenge.challengeId,
        title: "Find the shared symbol",
        detail: "Select it on your lower card"
      };
    case "challenge-feedback": {
      const answeringPlayer = playerLookup.get(
        state.correctFeedback.answeringPlayerId
      );
      const answerer =
        answeringPlayer?.id === currentPlayerId
          ? "You"
          : (answeringPlayer?.displayName ?? "Your opponent");
      return {
        key: `correct-${state.challenge.challengeId}`,
        title: `${answerer} found it!`,
        detail: `${getSymbolMatchSymbol(state.correctFeedback.symbolId).label} was the match`
      };
    }
    case "ending-feedback": {
      const winner =
        state.result.kind === "winner"
          ? playerLookup.get(state.result.winnerPlayerId)
          : undefined;
      return {
        key: `ending-${state.challenge.challengeId}`,
        title:
          winner?.id === currentPlayerId
            ? "You reached the target"
            : `${winner?.displayName ?? "Your opponent"} reached the target`,
        detail: "Final feedback is finishing"
      };
    }
    case "paused": {
      const seconds = Math.max(0, Math.ceil((state.graceEndsAt - now) / 1000));
      const disconnectedNames = state.disconnectedPlayerIds.map(
        (playerId) => playerLookup.get(playerId)?.displayName ?? "A player"
      );
      return {
        key: `paused-${seconds}`,
        title: "Match paused",
        detail: `${disconnectedNames.join(" and ")} disconnected · ${formatDuration(seconds)} remaining`
      };
    }
    case "finished":
      return {
        key: "finished",
        title: "Match complete",
        detail: "The server recorded the final result"
      };
  }
}

function getVisibleChallenge(
  state: PublicSymbolMatchGameState | null
): PublicSymbolMatchChallenge | null {
  if (
    state?.status === "challenge-open" ||
    state?.status === "challenge-feedback" ||
    state?.status === "ending-feedback"
  ) {
    return state.challenge;
  }
  return null;
}

function getWrongFeedback(
  state: PublicSymbolMatchGameState | null
): PublicSymbolMatchWrongFeedback[] {
  if (
    state?.status === "challenge-open" ||
    state?.status === "challenge-feedback" ||
    state?.status === "ending-feedback"
  ) {
    return state.wrongFeedback;
  }
  return [];
}

function getScore(
  state: PublicSymbolMatchGameState,
  playerId: string | undefined
): number {
  return state.scores.find((score) => score.playerId === playerId)?.points ?? 0;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function useAuthoritativeDisplayClock(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) {
      setNow(Date.now());
      return;
    }

    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, [active]);

  return now;
}
