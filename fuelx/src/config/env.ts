import 'dotenv/config';
import { z } from 'zod';

const DEV_ACCESS_SECRET = 'dev-access-secret-change-me-0123456789';
const DEV_REFRESH_SECRET = 'dev-refresh-secret-change-me-0123456789';
const DEV_OTP_SECRET = 'dev-otp-hmac-secret-change-me-0123456789';

const boolish = z
  .string()
  .transform((v) => v.toLowerCase() === 'true');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    PUBLIC_URL: z.string().url().default('http://localhost:3000'),
    MONGODB_URI: z.string().default(''),

    JWT_ACCESS_SECRET: z.string().default(DEV_ACCESS_SECRET),
    JWT_REFRESH_SECRET: z.string().default(DEV_REFRESH_SECRET),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    OTP_HMAC_SECRET: z.string().default(DEV_OTP_SECRET),
    CORS_ORIGINS: z.string().optional(),

    PAYMENT_DRIVER: z.enum(['mock', 'paystack']).default('mock'),
    PAYSTACK_SECRET_KEY: z.string().optional(),
    PAYSTACK_PUBLIC_KEY: z.string().optional(),

    ROUTING_DRIVER: z.enum(['haversine', 'ors']).default('haversine'),
    ORS_API_KEY: z.string().optional(),

    GEOCODE_DRIVER: z.enum(['nominatim', 'none']).default('nominatim'),
    GEOCODE_USER_AGENT: z.string().default('FuelX-MVP/1.0'),

    MAIL_DRIVER: z.enum(['console', 'smtp']).default('console'),
    SMTP_URL: z.string().optional(),
    MAIL_FROM: z.string().default('FuelX <no-reply@fuelx.test>'),

    STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
    CLOUDINARY_URL: z.string().optional(),

    PUSH_DRIVER: z.enum(['noop', 'webpush']).default('noop'),
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().default('mailto:ops@fuelx.test'),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    STATION_GEOFENCE_M: z.coerce.number().positive().default(150),
    DROPOFF_GEOFENCE_M: z.coerce.number().positive().default(200),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    SEED_ADMIN_EMAIL: z.string().email().default('admin@fuelx.test'),
    SEED_ADMIN_PASSWORD: z.string().default('ChangeMe123!'),

    // Reserved for future flag-driven behaviour; kept loose on purpose.
    FEATURE_FLAGS: z.string().optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    if (val.NODE_ENV === 'production') {
      const requiredSecrets: [keyof typeof val, string][] = [
        ['JWT_ACCESS_SECRET', DEV_ACCESS_SECRET],
        ['JWT_REFRESH_SECRET', DEV_REFRESH_SECRET],
        ['OTP_HMAC_SECRET', DEV_OTP_SECRET],
      ];
      for (const [key, devDefault] of requiredSecrets) {
        const value = val[key];
        if (typeof value !== 'string' || value.length < 32 || value === devDefault) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} must be set to a unique value of at least 32 characters in production`,
          });
        }
      }
      if (!val.MONGODB_URI) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MONGODB_URI'],
          message: 'MONGODB_URI is required in production',
        });
      }
    }
    if (val.PAYMENT_DRIVER === 'paystack' && !val.PAYSTACK_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PAYSTACK_SECRET_KEY'],
        message: 'PAYSTACK_SECRET_KEY is required when PAYMENT_DRIVER=paystack',
      });
    }
    if (val.ROUTING_DRIVER === 'ors' && !val.ORS_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ORS_API_KEY'],
        message: 'ORS_API_KEY is required when ROUTING_DRIVER=ors',
      });
    }
    if (val.STORAGE_DRIVER === 'cloudinary' && !val.CLOUDINARY_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CLOUDINARY_URL'],
        message: 'CLOUDINARY_URL is required when STORAGE_DRIVER=cloudinary',
      });
    }
    if (val.PUSH_DRIVER === 'webpush' && (!val.VAPID_PUBLIC_KEY || !val.VAPID_PRIVATE_KEY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['VAPID_PUBLIC_KEY'],
        message: 'VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are required when PUSH_DRIVER=webpush',
      });
    }
    if (val.MAIL_DRIVER === 'smtp' && !val.SMTP_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SMTP_URL'],
        message: 'SMTP_URL is required when MAIL_DRIVER=smtp',
      });
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:\n' + lines.join('\n'));
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  isDevelopment: raw.NODE_ENV === 'development',
  corsOrigins: (raw.CORS_ORIGINS ?? raw.PUBLIC_URL)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
} as const;

export type Env = typeof env;
export { boolish };
