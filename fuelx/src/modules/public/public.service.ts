import { Order } from '../../models/order.model';
import { DriverProfile } from '../../models/driver-profile.model';
import { Seal } from '../../models/seal.model';
import { Station } from '../../models/station.model';
import { getConfig } from '../pricing/pricing.service';
import { calculatePrice, toPublicBreakdown } from '../pricing/pricing.engine';
import { getSurgeMultiplier } from '../pricing/surge';
import { estimateEtaMinutes } from '../pricing/eta';
import { findNearestOpenStation } from '../stations/stations.service';
import { getRoutingProvider } from '../../providers/routing';
import { roundTo } from '../../lib/money';
import { canonicalSealCode } from '../../lib/codes';
import type { LatLng } from '../../lib/geo';
import type { PublicPriceBreakdown } from '../pricing/pricing.types';
import type { EstimateInput } from './public.schemas';

/** Distance assumed for a homepage estimate when the browser gives no coordinates. */
export const DEFAULT_ESTIMATE_DISTANCE_KM = 6;

export interface EstimateResult {
  breakdown: PublicPriceBreakdown;
  distanceKm: number;
  surgeMultiplier: number;
  station: { id: string; name: string } | null;
  etaMinutes: number;
}

/**
 * Price estimate for the homepage. Uses the same engine and surge as a real quote.
 * Stores nothing. With no coordinates it assumes a 6 km trip from the centre.
 */
export async function estimatePrice(input: EstimateInput): Promise<EstimateResult> {
  const config = await getConfig();
  const surgeMultiplier = await getSurgeMultiplier(config);

  let distanceKm = DEFAULT_ESTIMATE_DISTANCE_KM;
  let station: { id: string; name: string; lat: number; lng: number } | null = null;
  const dropoff: LatLng | undefined =
    input.lat !== undefined && input.lng !== undefined ? { lat: input.lat, lng: input.lng } : undefined;

  if (dropoff) {
    const nearest = await findNearestOpenStation(input.fuelType, dropoff);
    if (nearest) {
      station = {
        id: nearest.station.id,
        name: nearest.station.name,
        lat: nearest.station.lat,
        lng: nearest.station.lng,
      };
      const route = await getRoutingProvider().route(
        { lat: station.lat, lng: station.lng },
        dropoff,
        { roadFactor: config.timing.roadFactor },
      );
      distanceKm = route.distanceKm;
    }
  }

  const breakdown = calculatePrice(
    { fuelType: input.fuelType, litres: input.litres, distanceKm, surgeMultiplier, dropoff },
    config,
  );

  const etaMinutes = estimateEtaMinutes({
    fillSealMinutes: config.timing.fillSealMinutes,
    tripKm: breakdown.distanceKm,
    avgSpeedKmh: config.timing.avgSpeedKmh,
  });

  return {
    breakdown: toPublicBreakdown({ ...breakdown, distanceKm: roundTo(breakdown.distanceKm, 0.1) }),
    distanceKm: roundTo(breakdown.distanceKm, 0.1),
    surgeMultiplier,
    station: station ? { id: station.id, name: station.name } : null,
    etaMinutes,
  };
}

export interface PublicStats {
  deliveries: number;
  litresDelivered: number;
  averageDeliveryMinutes: number;
  driversOnline: number;
}

let statsCache: { value: PublicStats; at: number } | null = null;
const STATS_TTL_MS = 60_000;

export function resetStatsCache(): void {
  statsCache = null;
}

export async function getPublicStats(): Promise<PublicStats> {
  if (statsCache && Date.now() - statsCache.at < STATS_TTL_MS) return statsCache.value;

  const [agg, driversOnline] = await Promise.all([
    Order.aggregate<{ deliveries: number; litres: number; avgMinutes: number }>([
      { $match: { status: 'DELIVERED', 'times.deliveredAt': { $ne: null } } },
      {
        $group: {
          _id: null,
          deliveries: { $sum: 1 },
          litres: { $sum: '$litres' },
          avgMinutes: {
            $avg: { $divide: [{ $subtract: ['$times.deliveredAt', '$createdAt'] }, 60_000] },
          },
        },
      },
    ]),
    DriverProfile.countDocuments({ isOnline: true, approvalStatus: 'approved' }),
  ]);

  const row = agg[0];
  const value: PublicStats = {
    deliveries: row?.deliveries ?? 0,
    litresDelivered: row?.litres ?? 0,
    averageDeliveryMinutes: row ? Math.round(row.avgMinutes) : 0,
    driversOnline,
  };
  statsCache = { value, at: Date.now() };
  return value;
}

export interface SealVerification {
  genuine: boolean;
  status: string;
  message: string;
  stationName?: string;
  appliedAt?: string;
}

const SEAL_MESSAGES: Record<string, string> = {
  UNUSED: 'Valid, not yet used',
  VERIFIED: 'Delivered and verified',
  BROKEN: 'Reported tampered',
};

/**
 * Public seal check. Never reveals the order, only the seal's own state.
 * Unknown codes return genuine: false so a fake cannot be distinguished from a typo.
 */
export async function verifySealCode(rawCode: string): Promise<SealVerification> {
  const code = canonicalSealCode(rawCode);
  const seal = await Seal.findOne({ code }).lean();
  if (!seal) {
    return { genuine: false, status: 'UNKNOWN', message: 'Code not found' };
  }

  const status = seal.status;
  let stationName: string | undefined;
  if (seal.stationId) {
    const station = await Station.findById(seal.stationId).select({ name: 1 }).lean();
    stationName = station?.name ?? undefined;
  }

  const appliedAt = seal.appliedAt ? seal.appliedAt.toISOString() : undefined;

  let message: string;
  if (status === 'APPLIED') {
    const when = appliedAt ? new Date(appliedAt).toISOString().slice(0, 10) : 'an earlier date';
    message = stationName ? `Applied on ${when} at ${stationName}` : `Applied on ${when}`;
  } else {
    message = SEAL_MESSAGES[status] ?? 'Unknown seal state';
  }

  const genuine = status === 'UNUSED' || status === 'APPLIED' || status === 'VERIFIED' || status === 'BROKEN';

  return { genuine, status, message, stationName, appliedAt };
}
