import { CARD_BANK_GAME_ID } from "@multiplayer-blueprint/shared";
import {
  CardBankGameModule,
  type CardBankGameOptions
} from "./card-bank/cardBankGame.js";

export type GameModuleMap = {
  [CARD_BANK_GAME_ID]: CardBankGameModule;
};

export type GameRegistryOptions = {
  [CARD_BANK_GAME_ID]?: CardBankGameOptions;
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
    [CARD_BANK_GAME_ID]: new CardBankGameModule(options[CARD_BANK_GAME_ID])
  });
}
