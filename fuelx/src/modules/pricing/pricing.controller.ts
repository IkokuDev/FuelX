import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendOk } from '../../lib/response';
import { getConfig, updateConfig } from './pricing.service';
import { writeAudit } from '../admin/audit.service';
import type { FuelType } from '../../config/constants';

export interface PublicConfig {
  fuels: Array<{ fuelType: FuelType; retailPerLitreKobo: number }>;
  minLitres: number;
  maxLitres: number;
  canCapacityLitres: number;
  serviceArea: { centre: { lat: number; lng: number }; radiusKm: number };
  fees: { baseDeliveryFeeKobo: number; baseCoveredKm: number; perKmKobo: number; serviceFeeRate: number };
  maxSurgeMultiplier: number;
}

/** Public, non-sensitive view of the pricing config for the homepage. */
export async function buildPublicConfig(): Promise<PublicConfig> {
  const config = await getConfig();
  const fuels = (Object.keys(config.fuel) as FuelType[])
    .filter((f) => config.fuel[f].enabled)
    .map((f) => ({ fuelType: f, retailPerLitreKobo: config.fuel[f].retailPerLitreKobo }));
  return {
    fuels,
    minLitres: config.order.minLitres,
    maxLitres: config.order.maxLitres,
    canCapacityLitres: config.order.canCapacityLitres,
    serviceArea: config.serviceArea,
    fees: {
      baseDeliveryFeeKobo: config.fees.baseDeliveryFeeKobo,
      baseCoveredKm: config.fees.baseCoveredKm,
      perKmKobo: config.fees.perKmKobo,
      serviceFeeRate: config.fees.serviceFeeRate,
    },
    maxSurgeMultiplier: config.surge.maxMultiplier,
  };
}

export const publicConfigHandler = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await buildPublicConfig());
});

export const getAdminPricingHandler = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, { config: await getConfig() });
});

export const updateAdminPricingHandler = asyncHandler(async (req: Request, res: Response) => {
  const config = await updateConfig(req.body);
  await writeAudit(req.user!.id, 'pricing.update', 'PricingConfig', config.key, req.body);
  sendOk(res, { config });
});
