import {
  CARD_BANK_GAME_ID,
  CARD_BANK_MAX_PLAYERS,
  CARD_BANK_MIN_PLAYERS
} from "@multiplayer-blueprint/shared";
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

  it("exposes the registered game's schemas and player limits", () => {
    const cardBankModule = createGameRegistry().get(CARD_BANK_GAME_ID);

    expect(
      cardBankModule.settingsSchema.safeParse({
        extraLivesEnabled: true
      }).success
    ).toBe(true);
    expect(
      cardBankModule.settingsSchema.safeParse({
        extraLivesEnabled: "yes"
      }).success
    ).toBe(false);
    expect(
      cardBankModule.actionSchema.safeParse({ type: "stop-turn" }).success
    ).toBe(true);
    expect(
      cardBankModule.actionSchema.safeParse({ type: "unknown-action" }).success
    ).toBe(false);
    expect(cardBankModule.playerLimits).toEqual({
      min: CARD_BANK_MIN_PLAYERS,
      max: CARD_BANK_MAX_PLAYERS
    });
  });
});
