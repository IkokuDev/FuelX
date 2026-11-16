import { z } from 'zod';

export const offerIdParamSchema = z.object({
  offerId: z.string().min(1),
});

export const acceptOfferSchema = z.object({}).strict();

export const declineOfferSchema = z.object({
  reason: z.string().max(200).optional(),
}).strict();

export const goOnlineSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
}).strict();

export const goOfflineSchema = z.object({}).strict();

export const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speedKmh: z.number().min(0).max(200).optional(),
  accuracyM: z.number().min(0).optional(),
  ts: z.number().optional(),
}).strict();