import { z } from 'zod';
import { phoneSchema } from '../auth/auth.schemas';

export const createAddressSchema = z
  .object({
    label: z.string().min(1).max(60),
    line1: z.string().min(1).max(240),
    landmark: z.string().max(240).optional(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    contactName: z.string().max(120).optional(),
    contactPhone: phoneSchema.optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const updateAddressSchema = createAddressSchema.partial().strict();

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
