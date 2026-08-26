import {
  SYMBOL_MATCH_CARD_COUNT,
  SYMBOL_MATCH_MAX_PRINTED_SYMBOL_SCALE,
  SYMBOL_MATCH_MIN_PRINTED_SYMBOL_SCALE,
  SYMBOL_MATCH_SYMBOL_COUNT,
  SYMBOL_MATCH_SYMBOL_IDS,
  SYMBOL_MATCH_SYMBOLS_PER_CARD,
  type SymbolMatchSymbolId
} from "@multiplayer-blueprint/shared";
import { describe, expect, it } from "vitest";
import { createSymbolMatchArtifactFingerprint } from "./fingerprint.js";
import {
  SYMBOL_MATCH_DECK,
  SYMBOL_MATCH_DECK_FINGERPRINT,
  SYMBOL_MATCH_DECK_VERSION
} from "./generatedDeck.js";
import {
  SYMBOL_MATCH_PRINTED_LAYOUTS,
  SYMBOL_MATCH_PRINTED_LAYOUTS_FINGERPRINT,
  SYMBOL_MATCH_PRINTED_LAYOUTS_VERSION
} from "./generatedPrintedLayouts.js";
import {
  generateSymbolMatchDeck,
  SYMBOL_MATCH_DECK_GENERATOR_VERSION
} from "./generateDeck.js";
import {
  generateSymbolMatchPrintedLayouts,
  getSymbolMatchPlacementRadius,
  SYMBOL_MATCH_LAYOUT_EDGE_PADDING,
  SYMBOL_MATCH_LAYOUT_GENERATOR_VERSION,
  SYMBOL_MATCH_LAYOUT_SYMBOL_GAP,
  SYMBOL_MATCH_LAYOUT_VALIDATION_CARD_DIAMETER_PX,
  SYMBOL_MATCH_MIN_POINTER_TARGET_PX
} from "./generatePrintedLayouts.js";
import type { SymbolMatchPrintedSymbolPlacement } from "./types.js";

const FLOATING_POINT_EPSILON = 0.0002;

describe("Symbol Match deterministic artifacts", () => {
  it("keeps the committed deck identical to deterministic generator output", () => {
    expect(generateSymbolMatchDeck()).toEqual(SYMBOL_MATCH_DECK);
    expect(SYMBOL_MATCH_DECK_VERSION).toBe(SYMBOL_MATCH_DECK_GENERATOR_VERSION);
    expect(SYMBOL_MATCH_DECK_FINGERPRINT).toBe(
      createSymbolMatchArtifactFingerprint(SYMBOL_MATCH_DECK)
    );
  });

  it("constructs the complete order-seven projective plane", () => {
    expect(SYMBOL_MATCH_DECK).toHaveLength(SYMBOL_MATCH_CARD_COUNT);
    expect(SYMBOL_MATCH_SYMBOL_IDS).toHaveLength(SYMBOL_MATCH_SYMBOL_COUNT);

    const appearances = new Map(
      SYMBOL_MATCH_SYMBOL_IDS.map((symbolId) => [symbolId, 0])
    );

    for (const [cardIndex, card] of SYMBOL_MATCH_DECK.entries()) {
      expect(card.id).toBe(cardIndex);
      expect(card.symbolIds).toHaveLength(SYMBOL_MATCH_SYMBOLS_PER_CARD);
      expect(new Set(card.symbolIds)).toHaveLength(
        SYMBOL_MATCH_SYMBOLS_PER_CARD
      );
      for (const symbolId of card.symbolIds) {
        appearances.set(symbolId, (appearances.get(symbolId) ?? 0) + 1);
      }
    }

    for (const appearanceCount of appearances.values()) {
      expect(appearanceCount).toBe(SYMBOL_MATCH_SYMBOLS_PER_CARD);
    }

    for (
      let leftIndex = 0;
      leftIndex < SYMBOL_MATCH_DECK.length;
      leftIndex += 1
    ) {
      const leftCard = SYMBOL_MATCH_DECK[leftIndex];
      if (leftCard === undefined) {
        throw new Error(`Missing card ${leftIndex}.`);
      }
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < SYMBOL_MATCH_DECK.length;
        rightIndex += 1
      ) {
        const rightCard = SYMBOL_MATCH_DECK[rightIndex];
        if (rightCard === undefined) {
          throw new Error(`Missing card ${rightIndex}.`);
        }
        const rightSymbols = new Set<SymbolMatchSymbolId>(rightCard.symbolIds);
        const sharedSymbols = leftCard.symbolIds.filter((symbolId) =>
          rightSymbols.has(symbolId)
        );
        expect(
          sharedSymbols,
          `cards ${leftIndex} and ${rightIndex}`
        ).toHaveLength(1);
      }
    }
  });

  it("keeps committed printed layouts identical to generator output", () => {
    expect(generateSymbolMatchPrintedLayouts(SYMBOL_MATCH_DECK)).toEqual(
      SYMBOL_MATCH_PRINTED_LAYOUTS
    );
    expect(SYMBOL_MATCH_PRINTED_LAYOUTS_VERSION).toBe(
      SYMBOL_MATCH_LAYOUT_GENERATOR_VERSION
    );
    expect(SYMBOL_MATCH_PRINTED_LAYOUTS_FINGERPRINT).toBe(
      createSymbolMatchArtifactFingerprint(SYMBOL_MATCH_PRINTED_LAYOUTS)
    );
  });

  it("provides one complete valid printed layout for every card", () => {
    expect(SYMBOL_MATCH_PRINTED_LAYOUTS).toHaveLength(SYMBOL_MATCH_CARD_COUNT);
    let placementCount = 0;

    for (const [cardIndex, layout] of SYMBOL_MATCH_PRINTED_LAYOUTS.entries()) {
      const card = SYMBOL_MATCH_DECK[cardIndex];
      if (card === undefined) {
        throw new Error(`Missing card ${cardIndex}.`);
      }
      expect(layout.cardId).toBe(card.id);
      expect(layout.printedSymbols).toHaveLength(SYMBOL_MATCH_SYMBOLS_PER_CARD);
      expect(layout.printedSymbols.map(({ symbolId }) => symbolId)).toEqual(
        card.symbolIds
      );

      for (const placement of layout.printedSymbols) {
        placementCount += 1;
        expect(placement.x).toBeGreaterThan(0);
        expect(placement.x).toBeLessThan(1);
        expect(placement.y).toBeGreaterThan(0);
        expect(placement.y).toBeLessThan(1);
        expect(placement.scale).toBeGreaterThanOrEqual(
          SYMBOL_MATCH_MIN_PRINTED_SYMBOL_SCALE
        );
        expect(placement.scale).toBeLessThanOrEqual(
          SYMBOL_MATCH_MAX_PRINTED_SYMBOL_SCALE
        );
        expect(placement.rotationDegrees).toBeGreaterThanOrEqual(0);
        expect(placement.rotationDegrees).toBeLessThan(360);
        expect(
          placement.scale * SYMBOL_MATCH_LAYOUT_VALIDATION_CARD_DIAMETER_PX
        ).toBeGreaterThanOrEqual(SYMBOL_MATCH_MIN_POINTER_TARGET_PX);

        const radius = getSymbolMatchPlacementRadius(placement.scale);
        const distanceFromCenter = Math.hypot(
          placement.x - 0.5,
          placement.y - 0.5
        );
        expect(
          distanceFromCenter + radius,
          `card ${card.id} symbol ${placement.symbolId} edge clearance`
        ).toBeLessThanOrEqual(
          0.5 - SYMBOL_MATCH_LAYOUT_EDGE_PADDING + FLOATING_POINT_EPSILON
        );
      }

      for (
        let leftIndex = 0;
        leftIndex < layout.printedSymbols.length;
        leftIndex += 1
      ) {
        const left = layout.printedSymbols[leftIndex];
        if (left === undefined) {
          throw new Error(`Missing placement ${leftIndex}.`);
        }
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < layout.printedSymbols.length;
          rightIndex += 1
        ) {
          const right = layout.printedSymbols[rightIndex];
          if (right === undefined) {
            throw new Error(`Missing placement ${rightIndex}.`);
          }
          const actualDistance = Math.hypot(left.x - right.x, left.y - right.y);
          const requiredDistance =
            getSymbolMatchPlacementRadius(left.scale) +
            getSymbolMatchPlacementRadius(right.scale) +
            SYMBOL_MATCH_LAYOUT_SYMBOL_GAP;
          expect(
            actualDistance + FLOATING_POINT_EPSILON,
            `card ${card.id} symbols ${left.symbolId} and ${right.symbolId}`
          ).toBeGreaterThanOrEqual(requiredDistance);
        }
      }
    }

    expect(placementCount).toBe(
      SYMBOL_MATCH_CARD_COUNT * SYMBOL_MATCH_SYMBOLS_PER_CARD
    );
  });

  it("preserves explicit reviewed card overrides during regeneration", () => {
    const card = SYMBOL_MATCH_DECK[0];
    if (card === undefined) {
      throw new Error("Missing first card.");
    }
    const override: readonly SymbolMatchPrintedSymbolPlacement[] =
      card.symbolIds.map((symbolId, index) => ({
        symbolId,
        x: 0.1 + index * 0.01,
        y: 0.2 + index * 0.01,
        scale: SYMBOL_MATCH_MIN_PRINTED_SYMBOL_SCALE,
        rotationDegrees: index
      }));

    expect(generateSymbolMatchPrintedLayouts([card], { 0: override })).toEqual([
      {
        cardId: 0,
        printedSymbols: override
      }
    ]);
  });

  it("rejects deck generation with the wrong number of symbols", () => {
    expect(() =>
      generateSymbolMatchDeck(SYMBOL_MATCH_SYMBOL_IDS.slice(0, -1))
    ).toThrow(`Expected ${SYMBOL_MATCH_SYMBOL_COUNT} symbols`);
  });
});
