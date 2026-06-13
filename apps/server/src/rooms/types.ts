import type {
  DemoGameState,
  PublicChatMessage,
  PublicPlayer,
  RoomPhase
} from "@multiplayer-blueprint/shared";

export type Player = PublicPlayer & {
  socketId: string | null;
};

export type Room = {
  code: string;
  hostPlayerId: string;
  phase: RoomPhase;
  players: Record<string, Player>;
  chatMessages: PublicChatMessage[];
  gameState: DemoGameState | null;
  version: number;
  createdAt: number;
  updatedAt: number;
};
