import { AppError } from '../../lib/errors';
import { haversineKm, type LatLng } from '../../lib/geo';
import { roundTo } from '../../lib/money';
import type { FuelType } from '../../config/constants';
import type { PriceBreakdown, PublicPriceBreakdown, PricingConfigData } from './pricing.types';

export interface PriceInput {
  fuelType: FuelType;
  litres: number;
  /** Road distance in km from the pickup station to the drop-off. */
  distanceKm: number;
  /** Surge multiplier applied to the delivery fee only. */
  surgeMultiplier: number;
  /** Drop-off point, used for the service-area check. */
  dropoff?: LatLng;
}

/**
 * Pure price calculation (plan section 10). No database access, no side effects.
 *
 *   F = L · p
 *   D = round_Δ((B + P · ceil(max(0, d − c))) · s)
 *   S = round_Δ(r · F)
 *   V = round_Δ((D + S) · v)
 *   T = F + D + S + V
 */
export function calculatePrice(input: PriceInput, config: PricingConfigData): PriceBreakdown {
  validate(input, config);

  const { fees, fuel, driverPay } = config;
  const step = fees.roundingKobo;
  const entry = fuel[input.fuelType];

  const litres = input.litres;
  const p = entry.retailPerLitreKobo;

  const fuelSubtotalKobo = Math.round(litres * p);

  const extraKm = Math.ceil(Math.max(0, input.distanceKm - fees.baseCoveredKm));
  const rawDelivery = (fees.baseDeliveryFeeKobo + fees.perKmKobo * extraKm) * input.surgeMultiplier;
  const deliveryFeeKobo = roundTo(Math.round(rawDelivery), step);

  const serviceFeeKobo = roundTo(Math.round(fees.serviceFeeRate * fuelSubtotalKobo), step);
  const vatKobo = roundTo(Math.round((deliveryFeeKobo + serviceFeeKobo) * fees.vatRate), step);

  const totalKobo = fuelSubtotalKobo + deliveryFeeKobo + serviceFeeKobo + vatKobo;

  const driverEarningKobo =
    deliveryFeeKobo + roundTo(Math.round(serviceFeeKobo * driverPay.bonusRateOfServiceFee), 100);

  const fuelCostKobo = Math.round(litres * entry.wholesalePerLitreKobo);

  return {
    litres,
    distanceKm: input.distanceKm,
    surgeMultiplier: input.surgeMultiplier,
    fuelUnitKobo: p,
    fuelSubtotalKobo,
    deliveryFeeKobo,
    serviceFeeKobo,
    vatKobo,
    totalKobo,
    driverEarningKobo,
    fuelCostKobo,
  };
}

function validate(input: PriceInput, config: PricingConfigData): void {
  const entry = config.fuel[input.fuelType];
  if (!entry || !entry.enabled) {
    throw new AppError('NO_STATION_AVAILABLE', 422, `${input.fuelType} is not available`);
  }
  if (!Number.isInteger(input.litres)) {
    throw new AppError('VALIDATION_ERROR', 400, 'Litres must be a whole number');
  }
  if (input.litres < config.order.minLitres || input.litres > config.order.maxLitres) {
    throw new AppError(
      'VALIDATION_ERROR',
      400,
      `Litres must be between ${config.order.minLitres} and ${config.order.maxLitres}`,
    );
  }
  if (input.dropoff) {
    const distFromCentre = haversineKm(input.dropoff, config.serviceArea.centre);
    if (distFromCentre > config.serviceArea.radiusKm) {
      throw new AppError('OUT_OF_SERVICE_AREA', 422, 'We do not deliver to that address yet');
    }
  }
  if (input.distanceKm > config.timing.maxStationToDropoffKm) {
    throw new AppError('NO_STATION_AVAILABLE', 422, 'No station is close enough to that address');
  }
  if (input.surgeMultiplier < 1) {
    throw new AppError('VALIDATION_ERROR', 400, 'Surge multiplier cannot be below 1');
  }
}

/** Cans required for a volume, given the can capacity. */
export function canCountFor(litres: number, canCapacityLitres: number): number {
  return Math.ceil(litres / canCapacityLitres);
}

/** Strip the internal margin fields a customer must never see. */
export function toPublicBreakdown(b: PriceBreakdown): PublicPriceBreakdown {
  const { driverEarningKobo: _d, fuelCostKobo: _f, ...rest } = b;
  return rest;
}
