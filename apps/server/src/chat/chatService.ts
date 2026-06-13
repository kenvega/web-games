import {
  MAX_CHAT_MESSAGES,
  chatMessageTextSchema,
  type PublicChatMessage
} from "@multiplayer-blueprint/shared";
import { nanoid } from "nanoid";

export function createChatMessage(input: {
  playerId: string;
  displayName: string;
  text: string;
  now: number;
}): PublicChatMessage {
  const text = chatMessageTextSchema.parse(input.text);

  return {
    id: nanoid(12),
    playerId: input.playerId,
    displayName: input.displayName,
    text,
    createdAt: input.now
  };
}

export function appendChatMessage(
  messages: PublicChatMessage[],
  message: PublicChatMessage
): PublicChatMessage[] {
  return [...messages, message].slice(-MAX_CHAT_MESSAGES);
}
