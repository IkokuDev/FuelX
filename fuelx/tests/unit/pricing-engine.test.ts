import { describe, expect, it } from 'vitest';
import { calculatePrice, canCountFor, toPublicBreakdown } from '../../src/modules/pricing/pricing.engine';
import { DEFAULT_PRICING_CONFIG } from '../../src/models/pricing-config.model';
import { multiplierForRatio } from '../../src/modules/pricing/surge';
import type { PricingConfigData } from '../../src/modules/pricing/pricing.types';

const config: PricingConfigData = JSON.parse(JSON.stringify(DEFAULT_PRICING_CONFIG));

describe('calculatePrice — worked examples from the plan', () => {
  it('30 L petrol, 6.0 km, surge 1.0', () => {
    const b = calculatePrice(
      { fuelType: 'PETROL', litres: 30, distanceKm: 6.0, surgeMultiplier: 1.0 },
      config,
    );
    expect(b.fuelSubtotalKobo).toBe(1_950_000);
    expect(b.deliveryFeeKobo).toBe(90_000);
    expect(b.serviceFeeKobo).toBe(341_000);
    expect(b.vatKobo).toBe(0);
    expect(b.totalKobo).toBe(2_381_000);
    expect(b.driverEarningKobo).toBe(124_100);
    expect(b.fuelCostKobo).toBe(1_800_000);
  });

  it('50 L petrol, 3.2 km, surge 1.2', () => {
    const b = calculatePrice(
      { fuelType: 'PETROL', litres: 50, distanceKm: 3.2, surgeMultiplier: 1.2 },
      config,
    );
    expect(b.fuelSubtotalKobo).toBe(3_250_000);
    expect(b.deliveryFeeKobo).toBe(84_000);
    expect(b.serviceFeeKobo).toBe(569_000);
    expect(b.totalKobo).toBe(3_903_000);
    expect(b.driverEarningKobo).toBe(140_900);
  });

  it('10 L diesel, 1.5 km, surge 1.0', () => {
    const b = calculatePrice(
      { fuelType: 'DIESEL', litres: 10, distanceKm: 1.5, surgeMultiplier: 1.0 },
      config,
    );
    expect(b.fuelSubtotalKobo).toBe(1_000_000);
    expect(b.deliveryFeeKobo).toBe(50_000);
    expect(b.serviceFeeKobo).toBe(175_000);
    expect(b.totalKobo).toBe(1_225_000);
    expect(b.driverEarningKobo).toBe(67_500);
  });

  it('every kobo amount is an integer', () => {
    const b = calculatePrice(
      { fuelType: 'PETROL', litres: 37, distanceKm: 4.7, surgeMultiplier: 1.35 },
      config,
    );
    const koboFields = [
      b.fuelUnitKobo,
      b.fuelSubtotalKobo,
      b.deliveryFeeKobo,
      b.serviceFeeKobo,
      b.vatKobo,
      b.totalKobo,
      b.driverEarningKobo,
      b.fuelCostKobo,
    ];
    for (const value of koboFields) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe('calculatePrice — distance edges', () => {
  it('exactly 2.0 km adds no extra km', () => {
    const b = calculatePrice(
      { fuelType: 'PETROL', litres: 20, distanceKm: 2.0, surgeMultiplier: 1.0 },
      config,
    );
    expect(b.deliveryFeeKobo).toBe(50_000);
  });

  it('2.01 km adds exactly one extra km', () => {
    const b = calculatePrice(
      { fuelType: 'PETROL', litres: 20, distanceKm: 2.01, surgeMultiplier: 1.0 },
      config,
    );
    expect(b.deliveryFeeKobo).toBe(60_000);
  });
});

describe('calculatePrice — validation', () => {
  it('rejects litres below the minimum', () => {
    expect(() =>
      calculatePrice({ fuelType: 'PETROL', litres: 9, distanceKm: 3, surgeMultiplier: 1 }, config),
    ).toThrowError(/between/);
  });

  it('rejects litres above the maximum', () => {
    expect(() =>
      calculatePrice({ fuelType: 'PETROL', litres: 51, distanceKm: 3, surgeMultiplier: 1 }, config),
    ).toThrowError(/between/);
  });

  it('rejects a drop-off outside the service area', () => {
    expect(() =>
      calculatePrice(
        { fuelType: 'PETROL', litres: 20, distanceKm: 3, surgeMultiplier: 1, dropoff: { lat: 9.4, lng: 7.4951 } },
        config,
      ),
    ).toThrowError(/deliver/);
  });

  it('rejects a station further than the routed distance limit', () => {
    expect(() =>
      calculatePrice({ fuelType: 'PETROL', litres: 20, distanceKm: 16, surgeMultiplier: 1 }, config),
    ).toThrowError(/close enough/);
  });
});

describe('canCountFor', () => {
  it('rounds up to whole cans', () => {
    expect(canCountFor(30, 25)).toBe(2);
    expect(canCountFor(25, 25)).toBe(1);
    expect(canCountFor(10, 25)).toBe(1);
  });
});

describe('surge multiplierForRatio', () => {
  it('returns 1 below the first step', () => {
    expect(multiplierForRatio(0.5, config)).toBe(1.0);
    expect(multiplierForRatio(1.4, config)).toBe(1.0);
  });

  it('picks the highest qualifying step', () => {
    expect(multiplierForRatio(1.5, config)).toBe(1.2);
    expect(multiplierForRatio(2.0, config)).toBe(1.35);
    expect(multiplierForRatio(9, config)).toBe(1.5);
  });
});

describe('toPublicBreakdown', () => {
  it('hides driver earnings and fuel cost', () => {
    const b = calculatePrice(
      { fuelType: 'PETROL', litres: 30, distanceKm: 6, surgeMultiplier: 1 },
      config,
    );
    const pub = toPublicBreakdown(b) as Record<string, unknown>;
    expect(pub).not.toHaveProperty('driverEarningKobo');
    expect(pub).not.toHaveProperty('fuelCostKobo');
    expect(pub.totalKobo).toBe(b.totalKobo);
  });
});
