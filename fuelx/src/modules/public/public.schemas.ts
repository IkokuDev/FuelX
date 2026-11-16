import { z } from 'zod';
import { FUEL_TYPES } from '../../config/constants';

export const estimateSchema = z
  .object({
    fuelType: z.enum(FUEL_TYPES),
    litres: z.number().int().min(1).max(1000),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .strict()
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    message: 'lat and lng must be provided together',
    path: ['lat'],
  });

export const sealCodeParamSchema = z
  .object({
    code: z.string().trim().min(6).max(20),
  })
  .strict();

export type EstimateInput = z.infer<typeof estimateSchema>;
