import type { CommandErrorCode } from "@multiplayer-blueprint/shared";

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

export interface GameModule<TRoom, TState, TAction, TPublicState> {
  start(room: TRoom, now: number): TState;

  handleAction(input: {
    room: TRoom;
    playerId: string;
    action: TAction;
    now: number;
  }): GameActionResult<TState>;

  toPublicState(state: TState): TPublicState;

  dispose?(roomCode: string): void;
}
