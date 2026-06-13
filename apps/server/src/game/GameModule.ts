import type {
  CommandErrorCode,
  CardBankGameAction,
  PublicCardBankGameState
} from "@multiplayer-blueprint/shared";
import type { Room } from "../rooms/types.js";

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

export interface GameModule<TState, TAction, TPublicState> {
  createInitialState(room: Room): TState;

  start(room: Room, now: number): TState;

  handleAction(input: {
    room: Room;
    playerId: string;
    action: TAction;
    now: number;
  }): GameActionResult<TState>;

  toPublicState(state: TState): TPublicState;

  dispose?(roomCode: string): void;
}

export type CardBankGameModuleContract<TState> = GameModule<
  TState,
  CardBankGameAction,
  PublicCardBankGameState
>;
