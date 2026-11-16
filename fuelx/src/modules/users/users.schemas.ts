import { z } from 'zod';
import { phoneSchema } from '../auth/auth.schemas';

export const updateMeSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    phone: phoneSchema.optional(),
  })
  .strict();

export const pushSubscriptionSchema = z
  .object({
    endpoint: z.string().url(),
    keys: z
      .object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
