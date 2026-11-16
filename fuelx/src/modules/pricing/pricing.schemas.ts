import { z } from 'zod';
import { FUEL_TYPES } from '../../config/constants';

const rate = z.number().min(0).max(1);
const kobo = z.number().int().min(0);

const fuelEntrySchema = z
  .object({
    enabled: z.boolean().optional(),
    retailPerLitreKobo: kobo.optional(),
    wholesalePerLitreKobo: kobo.optional(),
  })
  .strict();

export const updatePricingSchema = z
  .object({
    serviceArea: z
      .object({
        centre: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).strict().optional(),
        radiusKm: z.number().positive().optional(),
      })
      .strict()
      .optional(),
    fuel: z
      .object({
        PETROL: fuelEntrySchema.optional(),
        DIESEL: fuelEntrySchema.optional(),
      })
      .strict()
      .optional(),
    order: z
      .object({
        minLitres: z.number().int().positive().optional(),
        maxLitres: z.number().int().positive().optional(),
        canCapacityLitres: z.number().int().positive().optional(),
      })
      .strict()
      .optional(),
    fees: z
      .object({
        serviceFeeRate: rate.optional(),
        baseDeliveryFeeKobo: kobo.optional(),
        baseCoveredKm: z.number().min(0).optional(),
        perKmKobo: kobo.optional(),
        roundingKobo: z.number().int().positive().optional(),
        vatRate: rate.optional(),
        cancellationFeeKobo: kobo.optional(),
      })
      .strict()
      .optional(),
    driverPay: z.object({ bonusRateOfServiceFee: rate.optional() }).strict().optional(),
    surge: z
      .object({
        lookbackMinutes: z.number().positive().optional(),
        maxMultiplier: z.number().min(1).optional(),
        steps: z
          .array(z.object({ minRatio: z.number().min(0), multiplier: z.number().min(1) }).strict())
          .optional(),
      })
      .strict()
      .optional(),
    timing: z
      .object({
        quoteTtlMinutes: z.number().positive().optional(),
        offerTtlSeconds: z.number().positive().optional(),
        dispatchTimeoutSeconds: z.number().positive().optional(),
        avgSpeedKmh: z.number().positive().optional(),
        fillSealMinutes: z.number().min(0).optional(),
        roadFactor: z.number().min(1).optional(),
        maxStationToDropoffKm: z.number().positive().optional(),
      })
      .strict()
      .optional(),
    matching: z
      .object({
        weights: z
          .object({
            proximity: z.number().min(0).max(1),
            rating: z.number().min(0).max(1),
            acceptance: z.number().min(0).max(1),
            idle: z.number().min(0).max(1),
          })
          .strict()
          .optional(),
        ringsKm: z.array(z.number().positive()).min(1).optional(),
        staleLocationSeconds: z.number().positive().optional(),
        minRating: z.number().min(0).max(5).optional(),
        minRatingsToApply: z.number().int().min(0).optional(),
      })
      .strict()
      .optional(),
    cash: z
      .object({
        enabled: z.boolean().optional(),
        maxOrderKobo: kobo.optional(),
        driverOwedLimitKobo: kobo.optional(),
      })
      .strict()
      .optional(),
    payouts: z.object({ minKobo: kobo.optional() }).strict().optional(),
  })
  .strict();

/** Query schema for public config, kept here so FUEL_TYPES is reused. */
export const fuelTypeSchema = z.enum(FUEL_TYPES);

export type UpdatePricingInput = z.infer<typeof updatePricingSchema>;
