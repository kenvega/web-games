import {
  SYMBOL_MATCH_CARD_COUNT,
  SYMBOL_MATCH_SYMBOL_COUNT,
  SYMBOL_MATCH_SYMBOL_IDS,
  type SymbolMatchSymbolId
} from "@multiplayer-blueprint/shared";
import type { SymbolMatchDeck, SymbolMatchDeckCard } from "./types.js";

export const SYMBOL_MATCH_FINITE_FIELD_ORDER = 7;
export const SYMBOL_MATCH_DECK_GENERATOR_VERSION =
  "projective-plane-order-7-v1";

function affinePointIndex(x: number, y: number): number {
  return x * SYMBOL_MATCH_FINITE_FIELD_ORDER + y;
}

function slopeInfinityPointIndex(slope: number): number {
  return SYMBOL_MATCH_FINITE_FIELD_ORDER ** 2 + slope;
}

const VERTICAL_INFINITY_POINT_INDEX = SYMBOL_MATCH_SYMBOL_COUNT - 1;

function symbolAt(
  symbolIds: readonly SymbolMatchSymbolId[],
  pointIndex: number
): SymbolMatchSymbolId {
  const symbolId = symbolIds[pointIndex];
  if (symbolId === undefined) {
    throw new Error(`Missing Symbol Match symbol at point ${pointIndex}.`);
  }
  return symbolId;
}

export function generateSymbolMatchDeck(
  symbolIds: readonly SymbolMatchSymbolId[] = SYMBOL_MATCH_SYMBOL_IDS
): SymbolMatchDeck {
  if (symbolIds.length !== SYMBOL_MATCH_SYMBOL_COUNT) {
    throw new Error(
      `Expected ${SYMBOL_MATCH_SYMBOL_COUNT} symbols, received ${symbolIds.length}.`
    );
  }

  const cards: SymbolMatchDeckCard[] = [];

  for (let slope = 0; slope < SYMBOL_MATCH_FINITE_FIELD_ORDER; slope += 1) {
    for (
      let intercept = 0;
      intercept < SYMBOL_MATCH_FINITE_FIELD_ORDER;
      intercept += 1
    ) {
      const symbolIdsForCard: SymbolMatchSymbolId[] = [];
      for (let x = 0; x < SYMBOL_MATCH_FINITE_FIELD_ORDER; x += 1) {
        const y = (slope * x + intercept) % SYMBOL_MATCH_FINITE_FIELD_ORDER;
        symbolIdsForCard.push(symbolAt(symbolIds, affinePointIndex(x, y)));
      }
      symbolIdsForCard.push(
        symbolAt(symbolIds, slopeInfinityPointIndex(slope))
      );
      cards.push({
        id: cards.length,
        symbolIds: symbolIdsForCard
      });
    }
  }

  for (let x = 0; x < SYMBOL_MATCH_FINITE_FIELD_ORDER; x += 1) {
    const symbolIdsForCard: SymbolMatchSymbolId[] = [];
    for (let y = 0; y < SYMBOL_MATCH_FINITE_FIELD_ORDER; y += 1) {
      symbolIdsForCard.push(symbolAt(symbolIds, affinePointIndex(x, y)));
    }
    symbolIdsForCard.push(symbolAt(symbolIds, VERTICAL_INFINITY_POINT_INDEX));
    cards.push({
      id: cards.length,
      symbolIds: symbolIdsForCard
    });
  }

  cards.push({
    id: cards.length,
    symbolIds: Array.from(
      { length: SYMBOL_MATCH_FINITE_FIELD_ORDER },
      (_, slope) => symbolAt(symbolIds, slopeInfinityPointIndex(slope))
    ).concat(symbolAt(symbolIds, VERTICAL_INFINITY_POINT_INDEX))
  });

  if (cards.length !== SYMBOL_MATCH_CARD_COUNT) {
    throw new Error(
      `Expected ${SYMBOL_MATCH_CARD_COUNT} cards, generated ${cards.length}.`
    );
  }

  return cards;
}
