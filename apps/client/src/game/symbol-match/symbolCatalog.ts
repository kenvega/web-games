import type { SymbolMatchSymbolId } from "@multiplayer-blueprint/shared";

export type SymbolMatchSymbolDefinition = Readonly<{
  id: SymbolMatchSymbolId;
  label: string;
  assetUrl: string;
}>;

const symbolAssetModules = import.meta.glob<string>("./symbols/*.svg", {
  eager: true,
  query: "?url",
  import: "default"
});

function defineSymbol(
  id: SymbolMatchSymbolId,
  label: string
): SymbolMatchSymbolDefinition {
  const assetPath = `./symbols/${id}.svg`;
  const assetUrl = symbolAssetModules[assetPath];
  if (assetUrl === undefined) {
    throw new Error(`Missing Symbol Match asset: ${assetPath}`);
  }
  return Object.freeze({ id, label, assetUrl });
}

export const SYMBOL_MATCH_SYMBOL_CATALOG = {
  hammer: defineSymbol("hammer", "Hammer"),
  key: defineSymbol("key", "Key"),
  anchor: defineSymbol("anchor", "Anchor"),
  wrench: defineSymbol("wrench", "Wrench"),
  magnet: defineSymbol("magnet", "Magnet"),
  bell: defineSymbol("bell", "Bell"),
  lock: defineSymbol("lock", "Lock"),
  camera: defineSymbol("camera", "Camera"),
  sun: defineSymbol("sun", "Sun"),
  moon: defineSymbol("moon", "Moon"),
  cloud: defineSymbol("cloud", "Cloud"),
  "lightning-bolt": defineSymbol("lightning-bolt", "Lightning bolt"),
  flame: defineSymbol("flame", "Flame"),
  leaf: defineSymbol("leaf", "Leaf"),
  cactus: defineSymbol("cactus", "Cactus"),
  snowflake: defineSymbol("snowflake", "Snowflake"),
  cat: defineSymbol("cat", "Cat"),
  whale: defineSymbol("whale", "Whale"),
  owl: defineSymbol("owl", "Owl"),
  turtle: defineSymbol("turtle", "Turtle"),
  butterfly: defineSymbol("butterfly", "Butterfly"),
  frog: defineSymbol("frog", "Frog"),
  snail: defineSymbol("snail", "Snail"),
  bee: defineSymbol("bee", "Bee"),
  apple: defineSymbol("apple", "Apple"),
  cherries: defineSymbol("cherries", "Cherries"),
  watermelon: defineSymbol("watermelon", "Watermelon"),
  mushroom: defineSymbol("mushroom", "Mushroom"),
  cupcake: defineSymbol("cupcake", "Cupcake"),
  pretzel: defineSymbol("pretzel", "Pretzel"),
  carrot: defineSymbol("carrot", "Carrot"),
  lemon: defineSymbol("lemon", "Lemon"),
  rocket: defineSymbol("rocket", "Rocket"),
  sailboat: defineSymbol("sailboat", "Sailboat"),
  bicycle: defineSymbol("bicycle", "Bicycle"),
  airplane: defineSymbol("airplane", "Airplane"),
  train: defineSymbol("train", "Train"),
  balloon: defineSymbol("balloon", "Balloon"),
  planet: defineSymbol("planet", "Ringed planet"),
  "flying-saucer": defineSymbol("flying-saucer", "Flying saucer"),
  crown: defineSymbol("crown", "Crown"),
  shield: defineSymbol("shield", "Shield"),
  potion: defineSymbol("potion", "Potion bottle"),
  wand: defineSymbol("wand", "Magic wand"),
  "treasure-chest": defineSymbol("treasure-chest", "Treasure chest"),
  ghost: defineSymbol("ghost", "Ghost"),
  dice: defineSymbol("dice", "Dice"),
  "puzzle-piece": defineSymbol("puzzle-piece", "Puzzle piece"),
  star: defineSymbol("star", "Star"),
  heart: defineSymbol("heart", "Heart"),
  diamond: defineSymbol("diamond", "Diamond"),
  spiral: defineSymbol("spiral", "Spiral"),
  "water-drop": defineSymbol("water-drop", "Water drop"),
  "four-leaf-clover": defineSymbol("four-leaf-clover", "Four-leaf clover"),
  eye: defineSymbol("eye", "Eye"),
  "music-note": defineSymbol("music-note", "Music note"),
  boot: defineSymbol("boot", "Boot")
} as const satisfies Record<SymbolMatchSymbolId, SymbolMatchSymbolDefinition>;

export function getSymbolMatchSymbol(
  symbolId: SymbolMatchSymbolId
): SymbolMatchSymbolDefinition {
  return SYMBOL_MATCH_SYMBOL_CATALOG[symbolId];
}
