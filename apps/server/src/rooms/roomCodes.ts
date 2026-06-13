import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  roomCodeSchema
} from "@multiplayer-blueprint/shared";
import { customAlphabet } from "nanoid";

export const defaultRoomCodeFactory = customAlphabet(
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH
);

export function generateRoomCode(
  existingCodes: ReadonlySet<string>,
  codeFactory: () => string = defaultRoomCodeFactory
): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = codeFactory();
    if (
      !existingCodes.has(candidate) &&
      roomCodeSchema.safeParse(candidate).success
    ) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique room code.");
}
