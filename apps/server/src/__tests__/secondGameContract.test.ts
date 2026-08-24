import {
  CARD_BANK_GAME_ID,
  type GameContractMap
} from "@multiplayer-blueprint/shared";
import { describe, expect, expectTypeOf, it } from "vitest";
import { CardBankGameModule } from "../game/card-bank/cardBankGame.js";
import { GameRegistry } from "../game/gameRegistry.js";
import {
  TEST_FIRST_RESPONSE_GAME_ID,
  TestFirstResponseGameModule,
  type PublicTestFirstResponseRoom,
  type TestFirstResponseAction,
  type TestFirstResponseCommandErrorCode,
  type TestFirstResponseCreateRoomInput,
  type TestFirstResponseGameActionInput,
  type TestFirstResponseRoom,
  type TestFirstResponseSettings,
  type TestFirstResponseUpdateRoomSettingsInput
} from "./fixtures/firstResponseGame.js";

type TestGameContractMap = GameContractMap & {
  [TEST_FIRST_RESPONSE_GAME_ID]: {
    settings: TestFirstResponseSettings;
    action: TestFirstResponseAction;
    publicRoom: PublicTestFirstResponseRoom;
    createRoomInput: TestFirstResponseCreateRoomInput;
    updateRoomSettingsInput: TestFirstResponseUpdateRoomSettingsInput;
    gameActionInput: TestFirstResponseGameActionInput;
    errorCode: TestFirstResponseCommandErrorCode;
  };
};

function createTestRoom(): TestFirstResponseRoom {
  return {
    code: "23456789AB",
    gameId: TEST_FIRST_RESPONSE_GAME_ID,
    hostPlayerId: "alice",
    phase: "playing",
    players: {},
    chatMessages: [],
    game: {
      settings: {
        target: 7
      },
      state: null
    },
    version: 0,
    createdAt: 1000,
    updatedAt: 1000
  };
}

describe("second game contract proof", () => {
  it("composes a second game without weakening its correlated types", () => {
    expectTypeOf<
      TestGameContractMap[typeof TEST_FIRST_RESPONSE_GAME_ID]["settings"]
    >().toEqualTypeOf<TestFirstResponseSettings>();
    expectTypeOf<
      TestGameContractMap[typeof TEST_FIRST_RESPONSE_GAME_ID]["action"]
    >().toEqualTypeOf<TestFirstResponseAction>();
    expectTypeOf<
      TestGameContractMap[typeof CARD_BANK_GAME_ID]["settings"]
    >().not.toEqualTypeOf<TestFirstResponseSettings>();
  });

  it("keeps both concrete module types when a registry has two games", () => {
    const cardBankModule = new CardBankGameModule();
    const firstResponseModule = new TestFirstResponseGameModule();
    const registry = new GameRegistry({
      [CARD_BANK_GAME_ID]: cardBankModule,
      [TEST_FIRST_RESPONSE_GAME_ID]: firstResponseModule
    });

    expect(registry.get(CARD_BANK_GAME_ID)).toBe(cardBankModule);
    expect(registry.get(TEST_FIRST_RESPONSE_GAME_ID)).toBe(firstResponseModule);
    expectTypeOf(
      registry.get(TEST_FIRST_RESPONSE_GAME_ID)
    ).toEqualTypeOf<TestFirstResponseGameModule>();
  });

  it("supports a non-turn-based first-valid-response rule", () => {
    const module = new TestFirstResponseGameModule();
    const room = createTestRoom();
    room.game.state = module.start(room, 1000);

    const invalidClaim = module.handleAction({
      room,
      playerId: "bob",
      action: {
        type: "claim",
        value: 3
      },
      now: 1001
    });
    expect(invalidClaim).toMatchObject({
      accepted: false,
      errorCode: "CLAIM_NOT_AVAILABLE"
    });

    const winningClaim = module.handleAction({
      room,
      playerId: "alice",
      action: {
        type: "claim",
        value: 7
      },
      now: 1002
    });
    expect(winningClaim).toEqual({
      accepted: true,
      nextState: {
        status: "finished",
        target: 7,
        winnerPlayerId: "alice"
      }
    });

    if (!winningClaim.accepted) {
      throw new Error("Expected the first valid claim to win.");
    }
    room.game.state = winningClaim.nextState;

    const lateClaim = module.handleAction({
      room,
      playerId: "bob",
      action: {
        type: "claim",
        value: 7
      },
      now: 1003
    });
    expect(lateClaim).toMatchObject({
      accepted: false,
      errorCode: "CLAIM_NOT_AVAILABLE"
    });
  });
});
