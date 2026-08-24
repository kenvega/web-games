import {
  type CreateRoomInputFor,
  type GameActionInputFor,
  type PublicRoomBase,
  type UpdateRoomSettingsInputFor
} from "@multiplayer-blueprint/shared";
import { z } from "zod";
import type { GameActionResult, GameModule } from "../../game/GameModule.js";
import type { RoomBase } from "../../rooms/roomBase.js";

export const TEST_FIRST_RESPONSE_GAME_ID = "test-first-response" as const;

export type TestFirstResponseSettings = {
  target: number;
};

export type TestFirstResponseAction = {
  type: "claim";
  value: number;
};

export type TestFirstResponseState = {
  status: "playing" | "finished";
  target: number;
  winnerPlayerId: string | null;
};

export type PublicTestFirstResponseState = TestFirstResponseState;

export type TestFirstResponseRoom = RoomBase<
  typeof TEST_FIRST_RESPONSE_GAME_ID,
  TestFirstResponseSettings,
  TestFirstResponseState
>;

export type PublicTestFirstResponseRoom = PublicRoomBase<
  typeof TEST_FIRST_RESPONSE_GAME_ID
> & {
  game: {
    settings: TestFirstResponseSettings;
    state: PublicTestFirstResponseState | null;
  };
};

export type TestFirstResponseCreateRoomInput = CreateRoomInputFor<
  typeof TEST_FIRST_RESPONSE_GAME_ID,
  TestFirstResponseSettings
>;

export type TestFirstResponseUpdateRoomSettingsInput =
  UpdateRoomSettingsInputFor<
    typeof TEST_FIRST_RESPONSE_GAME_ID,
    TestFirstResponseSettings
  >;

export type TestFirstResponseGameActionInput =
  GameActionInputFor<TestFirstResponseAction>;

export const testFirstResponseSettingsSchema = z.object({
  target: z.number().int()
});

export const testFirstResponseActionSchema = z.object({
  type: z.literal("claim"),
  value: z.number().int()
});

export class TestFirstResponseGameModule implements GameModule<
  TestFirstResponseRoom,
  TestFirstResponseSettings,
  TestFirstResponseState,
  TestFirstResponseAction,
  PublicTestFirstResponseState
> {
  readonly settingsSchema = testFirstResponseSettingsSchema;
  readonly actionSchema = testFirstResponseActionSchema;
  readonly playerLimits = {
    min: 2,
    max: 8
  } as const;

  start(room: TestFirstResponseRoom, now: number): TestFirstResponseState {
    void now;
    return {
      status: "playing",
      target: room.game.settings.target,
      winnerPlayerId: null
    };
  }

  handleAction(input: {
    room: TestFirstResponseRoom;
    playerId: string;
    action: TestFirstResponseAction;
    now: number;
  }): GameActionResult<TestFirstResponseState> {
    const state = input.room.game.state;
    if (
      state === null ||
      state.status !== "playing" ||
      input.action.value !== state.target
    ) {
      return {
        accepted: false,
        errorCode: "INVALID_GAME_ACTION",
        message: "The claim is not valid."
      };
    }

    return {
      accepted: true,
      nextState: {
        ...state,
        status: "finished",
        winnerPlayerId: input.playerId
      }
    };
  }

  handlePlayerDisconnected(): null {
    return null;
  }

  syncScheduledTransition(): void {}

  toPublicState(state: TestFirstResponseState): PublicTestFirstResponseState {
    return state;
  }

  isFinished(state: TestFirstResponseState): boolean {
    return state.status === "finished";
  }

  dispose(): void {}
}
