import { z } from "zod";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH
} from "./multiplayer.js";
import { SUPPORTED_GAME_IDS } from "./gameIds.js";

const roomCodePattern = new RegExp(
  `^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`
);

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a display name.")
  .max(
    DISPLAY_NAME_MAX_LENGTH,
    `Display names must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`
  );

export const guestIdSchema = z.string().uuid();

export const gameIdSchema = z.enum(SUPPORTED_GAME_IDS);

export const roomCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(roomCodePattern, "Enter a valid room code."));

export const chatMessageTextSchema = z
  .string()
  .trim()
  .min(1, "Enter a message.")
  .max(
    CHAT_MESSAGE_MAX_LENGTH,
    `Messages must be ${CHAT_MESSAGE_MAX_LENGTH} characters or fewer.`
  );

export const createRoomInputSchema = z.object({
  gameId: gameIdSchema,
  guestId: guestIdSchema,
  displayName: displayNameSchema,
  settings: z.unknown()
});

export const updateRoomSettingsInputSchema = z.object({
  roomCode: roomCodeSchema,
  gameId: gameIdSchema,
  settings: z.unknown()
});

export const joinRoomInputSchema = z.object({
  roomCode: roomCodeSchema,
  guestId: guestIdSchema,
  displayName: displayNameSchema
});

export const roomCommandInputSchema = z.object({
  roomCode: roomCodeSchema
});

export const sendChatMessageInputSchema = z.object({
  roomCode: roomCodeSchema,
  text: chatMessageTextSchema
});

export const gameActionInputSchema = z.object({
  roomCode: roomCodeSchema,
  action: z.unknown()
});

export type CreateRoomInputData = z.infer<typeof createRoomInputSchema>;
export type UpdateRoomSettingsInputData = z.infer<
  typeof updateRoomSettingsInputSchema
>;
export type JoinRoomInputData = z.infer<typeof joinRoomInputSchema>;
export type RoomCommandInputData = z.infer<typeof roomCommandInputSchema>;
export type SendChatMessageInputData = z.infer<
  typeof sendChatMessageInputSchema
>;
export type GameActionInputData = z.infer<typeof gameActionInputSchema>;
