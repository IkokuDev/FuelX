import { z } from 'zod';
import { normalisePhone } from '../../lib/phone';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a digit');

export const phoneSchema = z.string().transform((v, ctx) => {
  try {
    return normalisePhone(v);
  } catch (err) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: (err as Error).message });
    return z.NEVER;
  }
});

export const registerSchema = z
  .object({
    role: z.enum(['customer', 'driver']),
    name: z.string().min(1).max(120),
    email: z.string().email().toLowerCase(),
    phone: phoneSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
