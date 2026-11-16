import { z } from 'zod';

export const referenceParamSchema = z
  .object({
    reference: z.string().trim().min(1).max(80),
  })
  .strict();

/** ₦500 minimum, ₦200,000 maximum (plan section 14). */
export const topupSchema = z
  .object({
    amountKobo: z.number().int().min(50_000).max(20_000_000),
  })
  .strict();

/** The mock "Pay (test)" button may state the amount so mismatch handling is testable. */
export const mockCompleteSchema = z
  .object({
    amountKobo: z.number().int().min(0).optional(),
  })
  .strict();

export type TopupInput = z.infer<typeof topupSchema>;
export type MockCompleteInput = z.infer<typeof mockCompleteSchema>;
