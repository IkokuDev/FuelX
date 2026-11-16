import { PricingConfig, DEFAULT_PRICING_CONFIG, type PricingConfigDoc } from '../../models/pricing-config.model';
import { AppError } from '../../lib/errors';
import type { FuelEntry, PricingConfigData } from './pricing.types';
import type { UpdatePricingInput } from './pricing.schemas';

const KEY = 'default';

/** Create the default config if it does not exist yet. Safe to call at every boot. */
export async function ensureDefaultConfig(): Promise<PricingConfigDoc> {
  const existing = await PricingConfig.findOne({ key: KEY });
  if (existing) return existing;
  return PricingConfig.create({ ...DEFAULT_PRICING_CONFIG });
}

export async function getConfigDoc(): Promise<PricingConfigDoc> {
  const doc = await PricingConfig.findOne({ key: KEY });
  if (doc) return doc;
  return ensureDefaultConfig();
}

export async function getConfig(): Promise<PricingConfigData> {
  const doc = await getConfigDoc();
  return toConfigData(doc);
}

export function toConfigData(doc: PricingConfigDoc): PricingConfigData {
  const o = doc.toObject();
  return {
    key: o.key,
    serviceArea: { centre: { lat: o.serviceArea.centre.lat, lng: o.serviceArea.centre.lng }, radiusKm: o.serviceArea.radiusKm },
    fuel: {
      PETROL: {
        enabled: o.fuel.PETROL.enabled,
        retailPerLitreKobo: o.fuel.PETROL.retailPerLitreKobo,
        wholesalePerLitreKobo: o.fuel.PETROL.wholesalePerLitreKobo,
      },
      DIESEL: {
        enabled: o.fuel.DIESEL.enabled,
        retailPerLitreKobo: o.fuel.DIESEL.retailPerLitreKobo,
        wholesalePerLitreKobo: o.fuel.DIESEL.wholesalePerLitreKobo,
      },
    },
    order: {
      minLitres: o.order.minLitres,
      maxLitres: o.order.maxLitres,
      canCapacityLitres: o.order.canCapacityLitres,
    },
    fees: {
      serviceFeeRate: o.fees.serviceFeeRate,
      baseDeliveryFeeKobo: o.fees.baseDeliveryFeeKobo,
      baseCoveredKm: o.fees.baseCoveredKm,
      perKmKobo: o.fees.perKmKobo,
      roundingKobo: o.fees.roundingKobo,
      vatRate: o.fees.vatRate,
      cancellationFeeKobo: o.fees.cancellationFeeKobo,
    },
    driverPay: { bonusRateOfServiceFee: o.driverPay.bonusRateOfServiceFee },
    surge: {
      lookbackMinutes: o.surge.lookbackMinutes,
      maxMultiplier: o.surge.maxMultiplier,
      steps: o.surge.steps.map((s) => ({ minRatio: s.minRatio, multiplier: s.multiplier })),
    },
    timing: {
      quoteTtlMinutes: o.timing.quoteTtlMinutes,
      offerTtlSeconds: o.timing.offerTtlSeconds,
      dispatchTimeoutSeconds: o.timing.dispatchTimeoutSeconds,
      avgSpeedKmh: o.timing.avgSpeedKmh,
      fillSealMinutes: o.timing.fillSealMinutes,
      roadFactor: o.timing.roadFactor,
      maxStationToDropoffKm: o.timing.maxStationToDropoffKm,
    },
    matching: {
      weights: {
        proximity: o.matching.weights.proximity,
        rating: o.matching.weights.rating,
        acceptance: o.matching.weights.acceptance,
        idle: o.matching.weights.idle,
      },
      ringsKm: [...o.matching.ringsKm],
      staleLocationSeconds: o.matching.staleLocationSeconds,
      minRating: o.matching.minRating,
      minRatingsToApply: o.matching.minRatingsToApply,
    },
    cash: {
      enabled: o.cash.enabled,
      maxOrderKobo: o.cash.maxOrderKobo,
      driverOwedLimitKobo: o.cash.driverOwedLimitKobo,
    },
    payouts: { minKobo: o.payouts.minKobo },
  };
}

function assertValid(data: PricingConfigData): void {
  const weights = data.matching.weights;
  const sum = weights.proximity + weights.rating + weights.acceptance + weights.idle;
  if (Math.abs(sum - 1) > 1e-6) {
    throw new AppError('VALIDATION_ERROR', 400, 'Matching weights must sum to 1');
  }
  for (let i = 1; i < data.matching.ringsKm.length; i += 1) {
    if (data.matching.ringsKm[i] <= data.matching.ringsKm[i - 1]) {
      throw new AppError('VALIDATION_ERROR', 400, 'Matching rings must ascend');
    }
  }
  if (data.order.maxLitres < data.order.minLitres) {
    throw new AppError('VALIDATION_ERROR', 400, 'maxLitres must be >= minLitres');
  }
}

function mergeFuelEntry(base: FuelEntry, patch?: Partial<FuelEntry>): FuelEntry {
  return {
    enabled: patch?.enabled ?? base.enabled,
    retailPerLitreKobo: patch?.retailPerLitreKobo ?? base.retailPerLitreKobo,
    wholesalePerLitreKobo: patch?.wholesalePerLitreKobo ?? base.wholesalePerLitreKobo,
  };
}

/** Apply a partial admin update and return the new plain config. */
export async function updateConfig(input: UpdatePricingInput): Promise<PricingConfigData> {
  const doc = await getConfigDoc();
  const current = toConfigData(doc);

  const merged: PricingConfigData = {
    key: current.key,
    serviceArea: input.serviceArea
      ? {
          centre: input.serviceArea.centre ?? current.serviceArea.centre,
          radiusKm: input.serviceArea.radiusKm ?? current.serviceArea.radiusKm,
        }
      : current.serviceArea,
    fuel: input.fuel
      ? {
          PETROL: mergeFuelEntry(current.fuel.PETROL, input.fuel.PETROL),
          DIESEL: mergeFuelEntry(current.fuel.DIESEL, input.fuel.DIESEL),
        }
      : current.fuel,
    order: { ...current.order, ...input.order },
    fees: { ...current.fees, ...input.fees },
    driverPay: { ...current.driverPay, ...input.driverPay },
    surge: {
      lookbackMinutes: input.surge?.lookbackMinutes ?? current.surge.lookbackMinutes,
      maxMultiplier: input.surge?.maxMultiplier ?? current.surge.maxMultiplier,
      steps: input.surge?.steps ?? current.surge.steps,
    },
    timing: { ...current.timing, ...input.timing },
    matching: {
      weights: { ...current.matching.weights, ...input.matching?.weights },
      ringsKm: input.matching?.ringsKm ?? current.matching.ringsKm,
      staleLocationSeconds: input.matching?.staleLocationSeconds ?? current.matching.staleLocationSeconds,
      minRating: input.matching?.minRating ?? current.matching.minRating,
      minRatingsToApply: input.matching?.minRatingsToApply ?? current.matching.minRatingsToApply,
    },
    cash: { ...current.cash, ...input.cash },
    payouts: { ...current.payouts, ...input.payouts },
  };

  assertValid(merged);
  doc.set(merged);
  await doc.save();
  return merged;
}
