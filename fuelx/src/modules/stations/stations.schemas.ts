import { z } from 'zod';
import { FUEL_TYPES } from '../../config/constants';
import { phoneSchema } from '../auth/auth.schemas';

export const createStationSchema = z
  .object({
    name: z.string().min(1).max(140),
    address: z.string().min(1).max(240),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    isOpen: z.boolean().optional(),
    fuelTypes: z.array(z.enum(FUEL_TYPES)).min(1),
    contactPhone: phoneSchema.optional(),
  })
  .strict();

export const updateStationSchema = createStationSchema.partial().strict();

export type CreateStationInput = z.infer<typeof createStationSchema>;
export type UpdateStationInput = z.infer<typeof updateStationSchema>;
