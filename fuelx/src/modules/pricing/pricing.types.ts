import type { FuelType } from '../../config/constants';

export interface FuelEntry {
  enabled: boolean;
  retailPerLitreKobo: number;
  wholesalePerLitreKobo: number;
}

export interface SurgeStep {
  minRatio: number;
  multiplier: number;
}

/** Plain shape of the PricingConfig document, used by the pure pricing engine. */
export interface PricingConfigData {
  key: string;
  serviceArea: { centre: { lat: number; lng: number }; radiusKm: number };
  fuel: Record<FuelType, FuelEntry>;
  order: { minLitres: number; maxLitres: number; canCapacityLitres: number };
  fees: {
    serviceFeeRate: number;
    baseDeliveryFeeKobo: number;
    baseCoveredKm: number;
    perKmKobo: number;
    roundingKobo: number;
    vatRate: number;
    cancellationFeeKobo: number;
  };
  driverPay: { bonusRateOfServiceFee: number };
  surge: { lookbackMinutes: number; maxMultiplier: number; steps: SurgeStep[] };
  timing: {
    quoteTtlMinutes: number;
    offerTtlSeconds: number;
    dispatchTimeoutSeconds: number;
    avgSpeedKmh: number;
    fillSealMinutes: number;
    roadFactor: number;
    maxStationToDropoffKm: number;
  };
  matching: {
    weights: { proximity: number; rating: number; acceptance: number; idle: number };
    ringsKm: number[];
    staleLocationSeconds: number;
    minRating: number;
    minRatingsToApply: number;
  };
  cash: { enabled: boolean; maxOrderKobo: number; driverOwedLimitKobo: number };
  payouts: { minKobo: number };
}

export interface PriceBreakdown {
  litres: number;
  distanceKm: number;
  surgeMultiplier: number;
  fuelUnitKobo: number;
  fuelSubtotalKobo: number;
  deliveryFeeKobo: number;
  serviceFeeKobo: number;
  vatKobo: number;
  totalKobo: number;
  driverEarningKobo: number;
  fuelCostKobo: number;
}

/** Fields a customer is allowed to see: no driverEarning or fuelCost. */
export type PublicPriceBreakdown = Omit<PriceBreakdown, 'driverEarningKobo' | 'fuelCostKobo'>;
