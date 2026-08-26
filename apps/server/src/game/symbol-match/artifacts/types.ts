import type { SymbolMatchSymbolId } from "@multiplayer-blueprint/shared";

export type SymbolMatchDeckCard = Readonly<{
  id: number;
  symbolIds: readonly SymbolMatchSymbolId[];
}>;

export type SymbolMatchDeck = readonly SymbolMatchDeckCard[];

export type SymbolMatchPrintedSymbolPlacement = Readonly<{
  symbolId: SymbolMatchSymbolId;
  x: number;
  y: number;
  scale: number;
  rotationDegrees: number;
}>;

export type SymbolMatchPrintedCardLayout = Readonly<{
  cardId: number;
  printedSymbols: readonly SymbolMatchPrintedSymbolPlacement[];
}>;

export type SymbolMatchPrintedLayouts = readonly SymbolMatchPrintedCardLayout[];

export type SymbolMatchPrintedLayoutOverrides = Readonly<
  Partial<Record<number, readonly SymbolMatchPrintedSymbolPlacement[]>>
>;
