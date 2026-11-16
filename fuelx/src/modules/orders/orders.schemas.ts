import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../../config/constants';

export const createOrderSchema = z
  .object({
    quoteId: z.string().trim().min(1).max(64),
    paymentMethod: z.enum(PAYMENT_METHODS),
    contactName: z.string().trim().min(2).max(80),
    contactPhone: z.string().trim().min(7).max(20),
    landmark: z.string().trim().max(120).optional(),
  })
  .strict();

export const cancelOrderSchema = z
  .object({
    reason: z.string().trim().min(3).max(240),
  })
  .strict();

export const listOrdersQuerySchema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const orderIdParamSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
  })
  .strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
