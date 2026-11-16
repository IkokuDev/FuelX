import { z } from 'zod';
import { FUEL_TYPES } from '../../config/constants';

export const createQuoteSchema = z
  .object({
    fuelType: z.enum(FUEL_TYPES),
    litres: z.number().int().min(1).max(1000),
    dropoff: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        addressText: z.string().trim().min(5).max(240),
      })
      .strict(),
  })
  .strict();

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
