import { z } from "zod";

export const cardBankSettingsSchema = z.object({
  extraLivesEnabled: z.boolean()
});

export const cardBankGameActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("draw-card"),
    choiceIndex: z
      .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
      .optional()
  }),
  z.object({
    type: z.literal("resolve-steal"),
    steal: z.boolean()
  }),
  z.object({
    type: z.literal("stop-turn")
  })
]);
