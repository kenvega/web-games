import {
  CARD_BANK_GAME_ID,
  SYMBOL_MATCH_GAME_ID
} from "@multiplayer-blueprint/shared";
import {
  CardBankGameModule,
  type CardBankGameOptions
} from "./card-bank/cardBankGame.js";
import {
  SymbolMatchGameModule,
  type SymbolMatchGameOptions
} from "./symbol-match/symbolMatchGame.js";

export type GameModuleMap = {
  [CARD_BANK_GAME_ID]: CardBankGameModule;
  [SYMBOL_MATCH_GAME_ID]: SymbolMatchGameModule;
};

export type GameRegistryOptions = {
  [CARD_BANK_GAME_ID]?: CardBankGameOptions;
  [SYMBOL_MATCH_GAME_ID]?: SymbolMatchGameOptions;
};

export class GameRegistry<TModules extends object = GameModuleMap> {
  constructor(private readonly modules: TModules) {}

  get<TGameId extends keyof TModules>(gameId: TGameId): TModules[TGameId] {
    return this.modules[gameId];
  }
}

export function createGameRegistry(
  options: GameRegistryOptions = {}
): GameRegistry<GameModuleMap> {
  return new GameRegistry({
    [CARD_BANK_GAME_ID]: new CardBankGameModule(options[CARD_BANK_GAME_ID]),
    [SYMBOL_MATCH_GAME_ID]: new SymbolMatchGameModule(
      options[SYMBOL_MATCH_GAME_ID]
    )
  });
}
