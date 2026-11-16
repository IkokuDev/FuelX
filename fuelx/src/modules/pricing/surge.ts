import { Order } from '../../models/order.model';
import { DriverProfile } from '../../models/driver-profile.model';
import type { PricingConfigData } from './pricing.types';

const CACHE_TTL_MS = 30_000;
let cache: { value: number; at: number } | null = null;

/** Pure step selection: the highest multiplier whose minRatio is met. */
export function multiplierForRatio(ratio: number, config: PricingConfigData): number {
  const qualifying = config.surge.steps.filter((s) => s.minRatio <= ratio);
  if (qualifying.length === 0) return 1.0;
  const best = Math.max(...qualifying.map((s) => s.multiplier));
  return Math.min(best, config.surge.maxMultiplier);
}

/** Demand (orders awaiting a driver) over supply (idle online drivers). */
export async function computeSurgeMultiplier(config: PricingConfigData): Promise<number> {
  const since = new Date(Date.now() - config.surge.lookbackMinutes * 60_000);
  const [demand, supply] = await Promise.all([
    Order.countDocuments({
      status: { $in: ['SEARCHING_DRIVER', 'DRIVER_ASSIGNED'] },
      createdAt: { $gte: since },
    }),
    DriverProfile.countDocuments({
      isOnline: true,
      approvalStatus: 'approved',
      currentOrderId: null,
    }),
  ]);
  const ratio = demand / Math.max(supply, 1);
  return multiplierForRatio(ratio, config);
}

export async function getSurgeMultiplier(config: PricingConfigData): Promise<number> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const value = await computeSurgeMultiplier(config);
  cache = { value, at: Date.now() };
  return value;
}

export function resetSurgeCache(): void {
  cache = null;
}
