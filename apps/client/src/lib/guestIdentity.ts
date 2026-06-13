import { displayNameSchema } from "@multiplayer-blueprint/shared";

const GUEST_ID_KEY = "multiplayer_guest_id";
const DISPLAY_NAME_KEY = "multiplayer_display_name";

export function getGuestId(): string {
  const existingGuestId = window.localStorage.getItem(GUEST_ID_KEY);
  if (existingGuestId !== null && existingGuestId.length > 0) {
    return existingGuestId;
  }

  const guestId = window.crypto.randomUUID();
  window.localStorage.setItem(GUEST_ID_KEY, guestId);
  return guestId;
}

export function getStoredDisplayName(): string {
  return window.localStorage.getItem(DISPLAY_NAME_KEY) ?? "";
}

export function storeDisplayName(displayName: string): string {
  const parsedDisplayName = displayNameSchema.parse(displayName);
  window.localStorage.setItem(DISPLAY_NAME_KEY, parsedDisplayName);
  return parsedDisplayName;
}
