import type { CommandErrorCode } from "@multiplayer-blueprint/shared";
import type { ZodType } from "zod";

export type GameActionResult<TState> =
  | {
      accepted: true;
      nextState: TState;
    }
  | {
      accepted: false;
      errorCode: CommandErrorCode;
      message: string;
    };

export interface GameModule<TRoom, TSettings, TState, TAction, TPublicState> {
  readonly settingsSchema: ZodType<TSettings>;
  readonly actionSchema: ZodType<TAction>;

  start(room: TRoom, now: number): TState;

  handleAction(input: {
    room: TRoom;
    playerId: string;
    action: TAction;
    now: number;
  }): GameActionResult<TState>;

  syncScheduledTransition(input: {
    room: TRoom;
    onTransition: (nextState: TState) => void;
  }): void;

  toPublicState(state: TState): TPublicState;

  dispose(roomCode: string): void;
}
