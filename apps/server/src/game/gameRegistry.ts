import { CARD_BANK_GAME_ID, type GameId } from "@multiplayer-blueprint/shared";
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

export class GameRegistry {
  constructor(private readonly modules: GameModuleMap) {}

  get<TGameId extends GameId>(gameId: TGameId): GameModuleMap[TGameId] {
    return this.modules[gameId];
  }
}

export function createGameRegistry(
  options: GameRegistryOptions = {}
): GameRegistry {
  return new GameRegistry({
    [CARD_BANK_GAME_ID]: new CardBankGameModule(options[CARD_BANK_GAME_ID])
  });
}
