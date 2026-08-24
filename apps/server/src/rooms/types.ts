import type { CardBankRoom } from "../game/card-bank/types.js";

export type { Player, RoomBase } from "./roomBase.js";

// This is the internal room union for every registered game. Add one member
// when another server game module is registered.
export type Room = CardBankRoom;
