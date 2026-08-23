import { CARD_BANK_GAME_ID } from "@multiplayer-blueprint/shared";
import { describe, expect, it } from "vitest";
import { CardBankGameModule } from "../game/card-bank/cardBankGame.js";
import { GameRegistry, createGameRegistry } from "../game/gameRegistry.js";

describe("GameRegistry", () => {
  it("returns the module registered for a game ID", () => {
    const cardBankModule = new CardBankGameModule();
    const registry = new GameRegistry({
      [CARD_BANK_GAME_ID]: cardBankModule
    });

    expect(registry.get(CARD_BANK_GAME_ID)).toBe(cardBankModule);
  });

  it("keeps one module instance per registered game", () => {
    const registry = createGameRegistry();

    expect(registry.get(CARD_BANK_GAME_ID)).toBe(
      registry.get(CARD_BANK_GAME_ID)
    );
  });
});
