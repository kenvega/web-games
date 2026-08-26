import { createHash } from "node:crypto";

export function createSymbolMatchArtifactFingerprint(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}
