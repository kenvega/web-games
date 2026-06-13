import { z } from "zod";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH
} from "./types.js";

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
  guestId: guestIdSchema,
  displayName: displayNameSchema
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

export const demoGameActionSchema = z.object({
  type: z.literal("claim-round")
});

export const gameActionInputSchema = z.object({
  roomCode: roomCodeSchema,
  action: demoGameActionSchema
});

export type CreateRoomInputData = z.infer<typeof createRoomInputSchema>;
export type JoinRoomInputData = z.infer<typeof joinRoomInputSchema>;
export type RoomCommandInputData = z.infer<typeof roomCommandInputSchema>;
export type SendChatMessageInputData = z.infer<
  typeof sendChatMessageInputSchema
>;
export type GameActionInputData = z.infer<typeof gameActionInputSchema>;
