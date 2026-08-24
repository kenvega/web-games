import type {
  PublicChatMessage,
  PublicPlayer,
  RoomPhase
} from "@multiplayer-blueprint/shared";

export type Player = PublicPlayer & {
  socketId: string | null;
};

export type RoomBase<TGameId extends string, TSettings, TState> = {
  code: string;
  gameId: TGameId;
  hostPlayerId: string;
  phase: RoomPhase;
  players: Record<string, Player>;
  chatMessages: PublicChatMessage[];
  game: {
    settings: TSettings;
    state: TState | null;
  };
  version: number;
  createdAt: number;
  updatedAt: number;
};
