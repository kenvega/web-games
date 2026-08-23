import { displayNameSchema } from "@multiplayer-blueprint/shared";
import { useCallback, useMemo, useState } from "react";
import {
  getGuestId,
  getStoredDisplayName,
  storeDisplayName
} from "../lib/guestIdentity.js";

export type GuestDisplayNameController = {
  guestId: string;
  displayName: string;
  error: string | null;
  setDisplayName: (displayName: string) => void;
  validateAndStore: () => string | null;
};

export function useGuestDisplayName(): GuestDisplayNameController {
  const guestId = useMemo(() => getGuestId(), []);
  const [displayName, setDisplayNameValue] = useState(getStoredDisplayName);
  const [error, setError] = useState<string | null>(null);

  const setDisplayName = useCallback((nextDisplayName: string) => {
    setDisplayNameValue(nextDisplayName);
    setError(null);
  }, []);

  const validateAndStore = useCallback((): string | null => {
    const parsedName = displayNameSchema.safeParse(displayName);
    if (!parsedName.success) {
      setError(parsedName.error.issues[0]?.message ?? "Enter a display name.");
      return null;
    }

    setError(null);
    const storedDisplayName = storeDisplayName(parsedName.data);
    setDisplayNameValue(storedDisplayName);
    return storedDisplayName;
  }, [displayName]);

  return {
    guestId,
    displayName,
    error,
    setDisplayName,
    validateAndStore
  };
}
