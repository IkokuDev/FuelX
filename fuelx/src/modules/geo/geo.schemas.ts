import { z } from 'zod';

export const geoSearchSchema = z
  .object({
    q: z.string().trim().min(3).max(200),
    limit: z.coerce.number().int().min(1).max(10).optional(),
  })
  .strict();

export const geoReverseSchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  })
  .strict();

export type GeoSearchQuery = z.infer<typeof geoSearchSchema>;
export type GeoReverseQuery = z.infer<typeof geoReverseSchema>;
