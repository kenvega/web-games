import { z } from "zod";
import {
  SYMBOL_MATCH_MAX_CHALLENGE_ID_LENGTH,
  SYMBOL_MATCH_SYMBOL_IDS
} from "./types.js";

export const symbolMatchTargetScoreSchema = z.union([
  z.literal(5),
  z.literal(7),
  z.literal(10)
]);

export const symbolMatchSymbolIdSchema = z.enum(SYMBOL_MATCH_SYMBOL_IDS);

export const symbolMatchSettingsSchema = z
  .object({
    targetScore: symbolMatchTargetScoreSchema
  })
  .strict();

export const symbolMatchGameActionSchema = z
  .object({
    type: z.literal("select-symbol"),
    challengeId: z
      .string()
      .min(1)
      .max(SYMBOL_MATCH_MAX_CHALLENGE_ID_LENGTH)
      .regex(/^[A-Za-z0-9_-]+$/),
    symbolId: symbolMatchSymbolIdSchema
  })
  .strict();
