import {
  DEFAULT_SYMBOL_MATCH_TARGET_SCORE,
  SYMBOL_MATCH_CARD_COUNT,
  SYMBOL_MATCH_CORRECT_FEEDBACK_MS,
  SYMBOL_MATCH_GAME_ID,
  SYMBOL_MATCH_MAX_PLAYERS,
  SYMBOL_MATCH_MAX_PRINTED_SYMBOL_SCALE,
  SYMBOL_MATCH_MIN_PLAYERS,
  SYMBOL_MATCH_MIN_PRINTED_SYMBOL_SCALE,
  SYMBOL_MATCH_PLAYABLE_CARD_COUNT,
  SYMBOL_MATCH_RECONNECT_GRACE_MS,
  SYMBOL_MATCH_START_COUNTDOWN_MS,
  SYMBOL_MATCH_SYMBOL_COUNT,
  SYMBOL_MATCH_SYMBOL_IDS,
  SYMBOL_MATCH_SYMBOLS_PER_CARD,
  SYMBOL_MATCH_TARGET_SCORE_OPTIONS,
  SYMBOL_MATCH_WRONG_FEEDBACK_MS,
  SYMBOL_MATCH_WRONG_REPEAT_WINDOW_MS,
  symbolMatchGameActionSchema,
  symbolMatchSettingsSchema,
  symbolMatchSymbolIdSchema,
  type GameContractMap,
  type PublicSymbolMatchChallenge,
  type PublicSymbolMatchRoomState,
  type SymbolMatchGameAction,
  type SymbolMatchSettings
} from "@multiplayer-blueprint/shared";
import { describe, expect, expectTypeOf, it } from "vitest";

describe("Symbol Match shared contract", () => {
  it("defines the approved player, score, timing, and layout constants", () => {
    expect(SYMBOL_MATCH_GAME_ID).toBe("symbol-match");
    expect({
      min: SYMBOL_MATCH_MIN_PLAYERS,
      max: SYMBOL_MATCH_MAX_PLAYERS
    }).toEqual({
      min: 2,
      max: 2
    });
    expect(SYMBOL_MATCH_TARGET_SCORE_OPTIONS).toEqual([5, 7, 10]);
    expect(DEFAULT_SYMBOL_MATCH_TARGET_SCORE).toBe(5);
    expect(SYMBOL_MATCH_WRONG_REPEAT_WINDOW_MS).toBe(500);
    expect(SYMBOL_MATCH_WRONG_FEEDBACK_MS).toBe(500);
    expect(SYMBOL_MATCH_CORRECT_FEEDBACK_MS).toBe(900);
    expect(SYMBOL_MATCH_START_COUNTDOWN_MS).toBe(3_000);
    expect(SYMBOL_MATCH_RECONNECT_GRACE_MS).toBe(60_000);
    expect(SYMBOL_MATCH_MIN_PRINTED_SYMBOL_SCALE).toBe(0.18);
    expect(SYMBOL_MATCH_MAX_PRINTED_SYMBOL_SCALE).toBe(0.3);
    expect(SYMBOL_MATCH_CARD_COUNT).toBe(57);
    expect(SYMBOL_MATCH_PLAYABLE_CARD_COUNT).toBe(56);
    expect(SYMBOL_MATCH_SYMBOLS_PER_CARD).toBe(8);
  });

  it("defines exactly 57 unique canonical symbol IDs", () => {
    expect(SYMBOL_MATCH_SYMBOL_IDS).toHaveLength(SYMBOL_MATCH_SYMBOL_COUNT);
    expect(new Set(SYMBOL_MATCH_SYMBOL_IDS)).toHaveLength(
      SYMBOL_MATCH_SYMBOL_COUNT
    );
    expect(SYMBOL_MATCH_SYMBOL_IDS).toContain("dice");
    expect(SYMBOL_MATCH_SYMBOL_IDS).toContain("flying-saucer");
    expect(SYMBOL_MATCH_SYMBOL_IDS).toContain("test-tube");
    expect(SYMBOL_MATCH_SYMBOL_IDS).toContain("money-bag");
    expect(SYMBOL_MATCH_SYMBOL_IDS).toContain("cyclone");
    expect(SYMBOL_MATCH_SYMBOL_IDS).not.toContain("die");
    expect(SYMBOL_MATCH_SYMBOL_IDS).not.toContain("ufo");
    expect(SYMBOL_MATCH_SYMBOL_IDS).not.toContain("potion");
    expect(SYMBOL_MATCH_SYMBOL_IDS).not.toContain("treasure-chest");
    expect(SYMBOL_MATCH_SYMBOL_IDS).not.toContain("spiral");

    for (const symbolId of SYMBOL_MATCH_SYMBOL_IDS) {
      expect(symbolMatchSymbolIdSchema.parse(symbolId)).toBe(symbolId);
    }
  });

  it("accepts only the approved target scores and exact settings shape", () => {
    for (const targetScore of SYMBOL_MATCH_TARGET_SCORE_OPTIONS) {
      expect(symbolMatchSettingsSchema.safeParse({ targetScore }).success).toBe(
        true
      );
    }

    for (const targetScore of [0, 4, 6, 15, "5"]) {
      expect(symbolMatchSettingsSchema.safeParse({ targetScore }).success).toBe(
        false
      );
    }

    expect(
      symbolMatchSettingsSchema.safeParse({
        targetScore: 5,
        unexpected: true
      }).success
    ).toBe(false);
  });

  it("accepts only a current-challenge symbol selection", () => {
    expect(
      symbolMatchGameActionSchema.parse({
        type: "select-symbol",
        challengeId: "challenge-12",
        symbolId: "hammer"
      })
    ).toEqual({
      type: "select-symbol",
      challengeId: "challenge-12",
      symbolId: "hammer"
    });

    for (const action of [
      {
        type: "select-symbol",
        challengeId: "",
        symbolId: "hammer"
      },
      {
        type: "select-symbol",
        challengeId: "challenge 12",
        symbolId: "hammer"
      },
      {
        type: "select-symbol",
        challengeId: "challenge-12",
        symbolId: "unknown"
      },
      {
        type: "claim-match",
        challengeId: "challenge-12",
        symbolId: "hammer"
      },
      {
        type: "select-symbol",
        challengeId: "challenge-12",
        symbolId: "hammer",
        score: 1
      },
      {
        type: "select-symbol",
        challengeId: "challenge-12",
        symbolId: "hammer",
        clientTimestamp: 1000
      }
    ]) {
      expect(symbolMatchGameActionSchema.safeParse(action).success).toBe(false);
    }
  });

  it("composes the game-owned types without exposing an answer field", () => {
    expectTypeOf<
      GameContractMap[typeof SYMBOL_MATCH_GAME_ID]["settings"]
    >().toEqualTypeOf<SymbolMatchSettings>();
    expectTypeOf<
      GameContractMap[typeof SYMBOL_MATCH_GAME_ID]["action"]
    >().toEqualTypeOf<SymbolMatchGameAction>();
    expectTypeOf<
      GameContractMap[typeof SYMBOL_MATCH_GAME_ID]["publicRoom"]
    >().toEqualTypeOf<PublicSymbolMatchRoomState>();
    expectTypeOf<PublicSymbolMatchChallenge>().not.toHaveProperty(
      "sharedSymbolId"
    );
  });
});
