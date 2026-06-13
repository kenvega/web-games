import {
  TARGET_SCORE,
  type DemoGameAction,
  type DemoGameState,
  type PublicDemoGameState
} from "@multiplayer-blueprint/shared";
import type {
  DemoGameModuleContract,
  GameActionResult
} from "../GameModule.js";
import type { Room } from "../../rooms/types.js";

export type DemoGameOptions = {
  startDelayMs: number;
};

export class DemoGameModule implements DemoGameModuleContract {
  private readonly startDelayMs: number;

  constructor(options: DemoGameOptions) {
    this.startDelayMs = options.startDelayMs;
  }

  createInitialState(): DemoGameState {
    return {
      roundNumber: 0,
      status: "round-finished",
      startsAt: null,
      winnerPlayerId: null,
      targetScore: TARGET_SCORE
    };
  }

  start(room: Room, now: number): DemoGameState {
    const currentState = room.gameState;
    const nextRoundNumber =
      currentState === null ||
      currentState.status === "match-finished" ||
      room.phase === "waiting"
        ? 1
        : currentState.roundNumber + 1;

    return {
      roundNumber: nextRoundNumber,
      status: "countdown",
      startsAt: now + this.startDelayMs,
      winnerPlayerId: null,
      targetScore: TARGET_SCORE
    };
  }

  handleAction(input: {
    room: Room;
    playerId: string;
    action: DemoGameAction;
    now: number;
  }): GameActionResult<DemoGameState> {
    if (input.action.type !== "claim-round") {
      return {
        accepted: false,
        errorCode: "INVALID_GAME_ACTION",
        message: "That game action is not valid."
      };
    }

    const state = input.room.gameState;
    if (state === null || state.status === "match-finished") {
      return {
        accepted: false,
        errorCode: "ROUND_NOT_ACTIVE",
        message: "There is no active round."
      };
    }

    if (state.status === "round-finished" || state.winnerPlayerId !== null) {
      return {
        accepted: false,
        errorCode: "ACTION_ALREADY_CLAIMED",
        message: "Another player acted first."
      };
    }

    if (state.startsAt === null || input.now < state.startsAt) {
      return {
        accepted: false,
        errorCode: "ROUND_NOT_ACTIVE",
        message: "Too early. Wait for the round to start."
      };
    }

    const player = input.room.players[input.playerId];
    if (player === undefined) {
      return {
        accepted: false,
        errorCode: "NOT_IN_ROOM",
        message: "You are not in this room."
      };
    }

    const nextScore = player.score + 1;
    const matchFinished = nextScore >= state.targetScore;

    return {
      accepted: true,
      scoringPlayerId: input.playerId,
      nextState: {
        ...state,
        status: matchFinished ? "match-finished" : "round-finished",
        winnerPlayerId: input.playerId
      }
    };
  }

  toPublicState(state: DemoGameState): PublicDemoGameState {
    return state;
  }

  dispose(): void {
    return;
  }
}
