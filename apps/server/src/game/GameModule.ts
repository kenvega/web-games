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

export type GamePlayerLimits = Readonly<{
  min: number;
  max: number;
}>;

export interface GameModule<TRoom, TSettings, TState, TAction, TPublicState> {
  readonly settingsSchema: ZodType<TSettings>;
  readonly actionSchema: ZodType<TAction>;
  readonly playerLimits: GamePlayerLimits;

  start(room: TRoom, now: number): TState;

  handleAction(input: {
    room: TRoom;
    playerId: string;
    action: TAction;
    now: number;
  }): GameActionResult<TState>;

  handlePlayerDisconnected(input: {
    room: TRoom;
    playerId: string;
    now: number;
  }): TState | null;

  syncScheduledTransition(input: {
    room: TRoom;
    onTransition: (nextState: TState) => void;
  }): void;

  toPublicState(state: TState): TPublicState;

  isFinished(state: TState): boolean;

  dispose(roomCode: string): void;
}
