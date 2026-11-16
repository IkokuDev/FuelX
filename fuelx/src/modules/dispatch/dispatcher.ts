import { Types } from 'mongoose';
import { Order } from '../../models/order.model';
import { DriverProfile } from '../../models/driver-profile.model';
import { DispatchOffer } from '../../models/dispatch-offer.model';
import { Station } from '../../models/station.model';
import { getConfig } from '../pricing/pricing.service';
import { getRoutingProvider } from '../../providers/routing';
import { logger } from '../../lib/logger';
import { publish } from '../../realtime/publisher';
import type { LatLng } from '../../lib/geo';
import type { OrderStatus, VehicleType } from '../../config/constants';
import type { RouteEstimate } from '../../providers/routing/types';

export interface Dispatcher {
  /**
   * Start or continue dispatch for an order. This is called when an order
   * enters SEARCHING_DRIVER, or when a driver declines/times out on an offer.
   * The implementation should find the next eligible driver and create an offer.
   */
  advance(orderId: string): Promise<void>;
}

interface DriverCandidate {
  driverId: Types.ObjectId;
  userId: Types.ObjectId;
  distanceToStationKm: number;
  score: number;
  vehicleType: VehicleType;
  maxLitres: number;
}

/**
 * Rank available drivers for an order (plan section 13):
 * 1. Must be approved, online, not on another order.
 * 2. Must have vehicle capacity >= order.litres.
 * 3. Score = distanceToStationKm (primary) + (ratingAvg desc as tie-break).
 * 4. Expand search rings: 3km, 7km, 15km, 30km, 60km.
 */
async function rankDrivers(
  stationLocation: LatLng,
  requiredLitres: number,
  excludedDriverIds: Types.ObjectId[],
  ringKm: number,
): Promise<DriverCandidate[]> {
  const candidates = await DriverProfile.find({
    approvalStatus: 'approved',
    isOnline: true,
    currentOrderId: null,
    'vehicle.maxLitres': { $gte: requiredLitres },
    _id: { $nin: excludedDriverIds },
    location: { $near: { $geometry: { type: 'Point', coordinates: [stationLocation.lng, stationLocation.lat] }, $maxDistance: ringKm * 1000 } },
  })
    .select({ userId: 1, vehicle: 1, stats: 1, location: 1, locationAt: 1 })
    .lean();

  const routing = getRoutingProvider();

  const ranked: DriverCandidate[] = [];
  for (const c of candidates) {
    if (!c.location || !c.location.coordinates) continue;
    const driverLoc: LatLng = { lat: c.location.coordinates[1], lng: c.location.coordinates[0] };
    const estimate = await routing.route(driverLoc, stationLocation, { roadFactor: 1.3 });
    const dist = estimate.distanceKm;
    if (dist > ringKm) continue;

    const ratingAvg = c.stats?.ratingAvg ?? 0;
    const score = dist * 1000 - ratingAvg * 100;
    ranked.push({
      driverId: c._id,
      userId: c.userId,
      distanceToStationKm: dist,
      score,
      vehicleType: c.vehicle.type,
      maxLitres: c.vehicle.maxLitres,
    });
  }

  ranked.sort((a, b) => a.score - b.score);
  return ranked;
}

/**
 * Create offers for the top N drivers in the current ring.
 * Ring progression: 3, 7, 15, 30, 60 km (configurable via PricingConfig.dispatch.ringsKm).
 * Offer TTL is PricingConfig.dispatch.offerTtlSeconds (default 120s).
 */
async function createOffers(
  orderId: string,
  stationLocation: LatLng,
  requiredLitres: number,
  excludedDriverIds: Types.ObjectId[],
  ringIndex: number,
): Promise<number> {
  const config = await getConfig();
  const rings = config.dispatch?.ringsKm ?? [3, 7, 15, 30, 60];
  const ttlSeconds = config.dispatch?.offerTtlSeconds ?? 120;
  const perRing = config.dispatch?.offersPerRing ?? 5;

  const ringKm = rings[ringIndex] ?? rings[rings.length - 1];
  const ranked = await rankDrivers(stationLocation, requiredLitres, excludedDriverIds, ringKm);

  let created = 0;
  for (const d of ranked.slice(0, perRing)) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    try {
      await DispatchOffer.create({
        orderId: new Types.ObjectId(orderId),
        driverId: d.userId,
        ringIndex,
        rank: created + 1,
        score: d.score,
        distanceToStationKm: d.distanceToStationKm,
        status: 'PENDING',
        expiresAt,
      });
      created += 1;
    } catch (err) {
      if (isDuplicateKey(err)) continue;
      throw err;
    }
  }
  return created;
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

/** Find the highest ringIndex that already has offers for this order. */
async function currentRingIndex(orderId: string): Promise<number> {
  const max = await DispatchOffer.findOne({ orderId: new Types.ObjectId(orderId) })
    .sort({ ringIndex: -1 })
    .select({ ringIndex: 1 })
    .lean();
  return max?.ringIndex ?? -1;
}

/** Expire any PENDING offers whose TTL has passed. Called by the sweeper. */
export async function expirePendingOffers(): Promise<number> {
  const now = new Date();
  const expired = await DispatchOffer.find({
    status: 'PENDING',
    expiresAt: { $lt: now },
  })
    .select({ _id: 1, orderId: 1, driverId: 1 })
    .lean();

  let count = 0;
  for (const o of expired) {
    await DispatchOffer.updateOne({ _id: o._id }, { $set: { status: 'EXPIRED' } });
    publish(`order:${o.orderId.toString()}`, 'offer:expired', { offerId: o._id.toString() });
    publish(`driver:${o.driverId.toString()}`, 'offer:expired', { offerId: o._id.toString() });
    count += 1;
  }
  return count;
}

/** Advance dispatch: if no PENDING/ACCEPTED offers exist, open the next ring. */
export async function advanceDispatch(orderId: string): Promise<void> {
  const order = await Order.findById(orderId)
    .select({ status: 1, stationId: 1, litres: 1, dispatch: 1 })
    .lean();
  if (!order) {
    logger.warn({ orderId }, 'dispatch.advance: order not found');
    return;
  }
  if (order.status !== 'SEARCHING_DRIVER') return;

  const station = await Station.findById(order.stationId).select({ location: 1 }).lean();
  if (!station?.location?.coordinates) {
    logger.warn({ orderId, stationId: order.stationId }, 'dispatch.advance: station location missing');
    return;
  }
  const stationLoc: LatLng = { lat: station.location.coordinates[1], lng: station.location.coordinates[0] };

  const excluded = (order.dispatch?.excludedDriverIds ?? []).map((id) => new Types.ObjectId(id));
  const ringIdx = await currentRingIndex(orderId);

  if (ringIdx >= 0) {
    const pending = await DispatchOffer.countDocuments({
      orderId: new Types.ObjectId(orderId),
      status: { $in: ['PENDING', 'ACCEPTED'] },
    });
    if (pending > 0) {
      logger.debug({ orderId, pending }, 'dispatch.advance: offers already pending');
      return;
    }
  }

  const nextRing = ringIdx + 1;
  const created = await createOffers(orderId, stationLoc, order.litres, excluded, nextRing);
  if (created === 0) {
    const config = await getConfig();
    const rings = config.dispatch?.ringsKm ?? [3, 7, 15, 30, 60];
    if (nextRing >= rings.length) {
      logger.info({ orderId }, 'dispatch.advance: no drivers found in any ring, moving to NO_DRIVER_AVAILABLE');
      const { transitionOrder } = await import('../orders/orders.service');
      await transitionOrder(orderId, 'NO_DRIVER_AVAILABLE', 'system');
    } else {
      logger.debug({ orderId, nextRing }, 'dispatch.advance: ring empty, will retry next sweep');
    }
  } else {
    logger.info({ orderId, ring: nextRing, created }, 'dispatch.advance: offers created');
  }
}

/** No-op dispatcher used until Phase 6 is fully wired. */
class NoopDispatcher implements Dispatcher {
  async advance(orderId: string): Promise<void> {
    await advanceDispatch(orderId);
  }
}

let instance: Dispatcher = new NoopDispatcher();

export function getDispatcher(): Dispatcher {
  return instance;
}

export function setDispatcher(d: Dispatcher): void {
  instance = d;
}