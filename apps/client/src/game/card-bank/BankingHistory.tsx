import {
  CARD_BANK_CARD_VALUES,
  type CardBankCardCounts,
  type CardBankCardValue,
  type PublicCardBankGameState,
  type PublicPlayer
} from "@multiplayer-blueprint/shared";
import { useEffect, useRef, useState } from "react";
import { GroupedCardTile } from "./GroupedCardTile.js";

export type BankingEvent = {
  id: number;
  displayName: string;
  cards: Array<{ value: CardBankCardValue; count: number }>;
};

export function useBankingHistory(
  gameState: PublicCardBankGameState | null,
  players: PublicPlayer[],
  roomVersion: number
): BankingEvent[] {
  const [events, setEvents] = useState<BankingEvent[]>([]);
  const previousCardsRef = useRef<Map<string, CardBankCardCounts>>(new Map());
  const previousSecuredRef = useRef<Map<string, number>>(new Map());
  const previousStatusRef = useRef<string | null>(null);
  const nextIdRef = useRef(1);
  const gameStateRef = useRef(gameState);
  const playersRef = useRef(players);
  gameStateRef.current = gameState;
  playersRef.current = players;

  useEffect(() => {
    const gs = gameStateRef.current;
    const pl = playersRef.current;

    if (gs === null) {
      previousCardsRef.current = new Map();
      previousSecuredRef.current = new Map();
      previousStatusRef.current = null;
      setEvents([]);
      return;
    }

    if (previousStatusRef.current === "finished" && gs.status === "playing") {
      previousCardsRef.current = new Map();
      previousSecuredRef.current = new Map();
      setEvents([]);
    }

    previousStatusRef.current = gs.status;

    const previousCards = previousCardsRef.current;
    const previousSecured = previousSecuredRef.current;
    const newEvents: BankingEvent[] = [];
    const playerLookup = new Map(pl.map((p) => [p.id, p]));

    for (const player of gs.players) {
      const prevCards = previousCards.get(player.playerId);
      const prevSecured = previousSecured.get(player.playerId);
      const prevActiveCount =
        prevCards === undefined
          ? 0
          : CARD_BANK_CARD_VALUES.reduce((sum, v) => sum + prevCards[v], 0);

      if (
        prevCards !== undefined &&
        prevActiveCount > 0 &&
        player.activeCount === 0 &&
        prevSecured !== undefined &&
        player.securedCardCount > prevSecured
      ) {
        const cards: BankingEvent["cards"] = [];
        for (const value of CARD_BANK_CARD_VALUES) {
          if (prevCards[value] > 0) {
            cards.push({ value, count: prevCards[value] });
          }
        }

        newEvents.push({
          id: nextIdRef.current++,
          displayName:
            playerLookup.get(player.playerId)?.displayName ?? "Unknown",
          cards
        });
      }
    }

    const nextCards = new Map<string, CardBankCardCounts>();
    const nextSecured = new Map<string, number>();
    for (const player of gs.players) {
      nextCards.set(player.playerId, player.activeCards);
      nextSecured.set(player.playerId, player.securedCardCount);
    }
    previousCardsRef.current = nextCards;
    previousSecuredRef.current = nextSecured;

    if (newEvents.length > 0) {
      setEvents((prev) => [...prev, ...newEvents]);
    }
  }, [roomVersion]);

  return events;
}

export function BankingHistory({ events }: { events: BankingEvent[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="grid content-start gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          History
        </h3>
        <p className="text-sm text-slate-500">
          Banking events will appear here as players secure their cards.
        </p>
      </div>
    );
  }

  return (
    <div className="grid content-start gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        History
      </h3>
      <ol className="grid gap-2">
        {events.map((event) => {
          const cardCount = event.cards.reduce(
            (total, card) => total + card.count,
            0
          );

          return (
            <li
              key={event.id}
              className="rounded-md border border-cyan-200/10 bg-slate-950/50 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-200">
                  {event.displayName}{" "}
                  <span className="font-normal text-slate-400">banked</span>
                </p>
                <span className="shrink-0 text-[0.7rem] text-slate-400">
                  {cardCount} {cardCount === 1 ? "card" : "cards"}
                </span>
              </div>
              <ul
                aria-label={`${event.displayName}'s banked cards grouped by value`}
                className="mt-3 flex flex-wrap gap-2.5"
              >
                {event.cards.map((card) => {
                  const label = `${card.count} banked ${
                    card.count === 1 ? "card" : "cards"
                  } worth ${card.value} ${
                    card.value === 1 ? "point" : "points"
                  } each`;

                  return (
                    <li key={card.value}>
                      <GroupedCardTile
                        count={card.count}
                        label={label}
                        value={card.value}
                      />
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
      <div ref={bottomRef} />
    </div>
  );
}
