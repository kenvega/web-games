import {
  SYMBOL_MATCH_MAX_PRINTED_SYMBOL_SCALE,
  SYMBOL_MATCH_MIN_PRINTED_SYMBOL_SCALE,
  SYMBOL_MATCH_SYMBOLS_PER_CARD
} from "@multiplayer-blueprint/shared";
import { SYMBOL_MATCH_PRINTED_LAYOUT_OVERRIDES } from "./layoutOverrides.js";
import type {
  SymbolMatchDeck,
  SymbolMatchDeckCard,
  SymbolMatchPrintedCardLayout,
  SymbolMatchPrintedLayoutOverrides,
  SymbolMatchPrintedLayouts,
  SymbolMatchPrintedSymbolPlacement
} from "./types.js";

export const SYMBOL_MATCH_LAYOUT_GENERATOR_VERSION =
  "seeded-circle-packing-v2-noto-roster";
export const SYMBOL_MATCH_LAYOUT_SEED = 0x51f15e7;
export const SYMBOL_MATCH_LAYOUT_EDGE_PADDING = 0.025;
export const SYMBOL_MATCH_LAYOUT_SYMBOL_GAP = 0.018;
export const SYMBOL_MATCH_LAYOUT_VALIDATION_CARD_DIAMETER_PX = 280;
export const SYMBOL_MATCH_MIN_POINTER_TARGET_PX = 44;

const SCALE_SEQUENCE = [
  SYMBOL_MATCH_MAX_PRINTED_SYMBOL_SCALE,
  0.28,
  0.26,
  0.24,
  0.22,
  0.21,
  0.19,
  SYMBOL_MATCH_MIN_PRINTED_SYMBOL_SCALE
] as const;
const MAX_CARD_ATTEMPTS = 500;
const MAX_PLACEMENT_ATTEMPTS = 2_000;
const VALUE_PRECISION = 10_000;

type MutablePlacement = {
  symbolIndex: number;
  x: number;
  y: number;
  scale: number;
  rotationDegrees: number;
};

function roundValue(value: number): number {
  return Math.round(value * VALUE_PRECISION) / VALUE_PRECISION;
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffledScales(random: () => number): number[] {
  const scales: number[] = [...SCALE_SEQUENCE];
  for (let index = scales.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [scales[index], scales[swapIndex]] = [
      scales[swapIndex] as number,
      scales[index] as number
    ];
  }
  return scales;
}

function placementRadius(scale: number): number {
  const minimumPointerScale =
    SYMBOL_MATCH_MIN_POINTER_TARGET_PX /
    SYMBOL_MATCH_LAYOUT_VALIDATION_CARD_DIAMETER_PX;
  return Math.max(scale, minimumPointerScale) / 2;
}

function placementsOverlap(
  candidate: MutablePlacement,
  placed: MutablePlacement
): boolean {
  const minimumDistance =
    placementRadius(candidate.scale) +
    placementRadius(placed.scale) +
    SYMBOL_MATCH_LAYOUT_SYMBOL_GAP;
  return (
    Math.hypot(candidate.x - placed.x, candidate.y - placed.y) < minimumDistance
  );
}

function tryGenerateCardLayout(
  card: SymbolMatchDeckCard,
  seed: number
): SymbolMatchPrintedCardLayout | null {
  const random = createRandom(seed);
  const scales = shuffledScales(random);
  const placements: MutablePlacement[] = [];
  const placementOrder = scales
    .map((scale, symbolIndex) => ({ scale, symbolIndex }))
    .sort((left, right) => right.scale - left.scale);

  for (const item of placementOrder) {
    const radius = placementRadius(item.scale);
    const maximumCenterDistance =
      0.5 - SYMBOL_MATCH_LAYOUT_EDGE_PADDING - radius;
    let placement: MutablePlacement | null = null;

    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * maximumCenterDistance;
      const candidate: MutablePlacement = {
        symbolIndex: item.symbolIndex,
        x: 0.5 + Math.cos(angle) * distance,
        y: 0.5 + Math.sin(angle) * distance,
        scale: item.scale,
        rotationDegrees: random() * 360
      };

      if (!placements.some((placed) => placementsOverlap(candidate, placed))) {
        placement = candidate;
        break;
      }
    }

    if (placement === null) {
      return null;
    }
    placements.push(placement);
  }

  const placementsBySymbolIndex = placements.sort(
    (left, right) => left.symbolIndex - right.symbolIndex
  );
  const printedSymbols = placementsBySymbolIndex.map(
    (placement): SymbolMatchPrintedSymbolPlacement => {
      const symbolId = card.symbolIds[placement.symbolIndex];
      if (symbolId === undefined) {
        throw new Error(
          `Card ${card.id} is missing symbol ${placement.symbolIndex}.`
        );
      }
      return {
        symbolId,
        x: roundValue(placement.x),
        y: roundValue(placement.y),
        scale: roundValue(placement.scale),
        rotationDegrees: roundValue(placement.rotationDegrees)
      };
    }
  );

  return {
    cardId: card.id,
    printedSymbols
  };
}

function generateCardLayout(
  card: SymbolMatchDeckCard
): SymbolMatchPrintedCardLayout {
  if (card.symbolIds.length !== SYMBOL_MATCH_SYMBOLS_PER_CARD) {
    throw new Error(
      `Card ${card.id} must contain ${SYMBOL_MATCH_SYMBOLS_PER_CARD} symbols.`
    );
  }

  for (let attempt = 0; attempt < MAX_CARD_ATTEMPTS; attempt += 1) {
    const seed =
      SYMBOL_MATCH_LAYOUT_SEED ^
      Math.imul(card.id + 1, 0x9e3779b1) ^
      Math.imul(attempt + 1, 0x85ebca6b);
    const layout = tryGenerateCardLayout(card, seed);
    if (layout !== null) {
      return layout;
    }
  }

  throw new Error(`Unable to place all symbols on card ${card.id}.`);
}

export function generateSymbolMatchPrintedLayouts(
  deck: SymbolMatchDeck,
  overrides: SymbolMatchPrintedLayoutOverrides = SYMBOL_MATCH_PRINTED_LAYOUT_OVERRIDES
): SymbolMatchPrintedLayouts {
  return deck.map((card) => {
    const override = overrides[card.id];
    return override === undefined
      ? generateCardLayout(card)
      : {
          cardId: card.id,
          printedSymbols: override
        };
  });
}

export function getSymbolMatchPlacementRadius(scale: number): number {
  return placementRadius(scale);
}
