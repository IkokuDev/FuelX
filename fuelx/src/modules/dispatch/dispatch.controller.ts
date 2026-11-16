import { Types } from 'mongoose';
import { Order } from '../../models/order.model';
import { DriverProfile } from '../../models/driver-profile.model';
import { DispatchOffer } from '../../models/dispatch-offer.model';
import { conflict, forbidden, notFound } from '../../lib/errors';
import { getDispatcher, expirePendingOffers, advanceDispatch } from './dispatcher';
import { publish } from '../../realtime/publisher';
import { transitionOrder } from '../orders/orders.service';
import type { OfferStatus } from '../../config/constants';
import type { ApiOrder } from '../orders/orders.service';

export interface DriverViewer {
  id: string;
  role: 'driver';
}

export interface ApiOffer {
  id: string;
  orderId: string;
  ringIndex: number;
  rank: number;
  score: number;
  distanceToStationKm: number;
  status: OfferStatus;
  expiresAt: string;
  order: {
    id: string;
    code: string;
    fuelType: string;
    litres: number;
    pickup: { name: string; lat: number; lng: number };
    dropoffArea: string;
    dropoffApprox: { lat: number; lng: number };
    earningKobo: number;
  };
}

function serializeOffer(offer: any, order: any): ApiOffer {
  const [lng, lat] = order.pickup.location.coordinates;
  const [dropLng, dropLat] = order.dropoff.location.coordinates;
  const earningKobo = Math.round(order.pricing.driverEarningKobo ?? 0);
  return {
    id: offer._id.toString(),
    orderId: offer.orderId.toString(),
    ringIndex: offer.ringIndex,
    rank: offer.rank,
    score: offer.score,
    distanceToStationKm: offer.distanceToStationKm,
    status: offer.status as OfferStatus,
    expiresAt: new Date(offer.expiresAt).toISOString(),
    order: {
      id: order._id.toString(),
      code: order.code,
      fuelType: order.fuelType,
      litres: order.litres,
      pickup: { name: order.pickup.name, lat, lng },
      dropoffArea: order.dropoff.addressText,
      dropoffApprox: { lat: dropLat, lng: dropLng },
      earningKobo,
    },
  };
}

async function getPendingOfferForDriver(driverId: string): Promise<any> {
  return DispatchOffer.findOne({
    driverId: new Types.ObjectId(driverId),
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  })
    .populate('orderId')
    .lean();
}

/** Driver accepts an offer -> order moves to DRIVER_ASSIGNED. */
export async function acceptOfferHandler(
  driverId: string,
  offerId: string,
): Promise<ApiOrder> {
  const offer = await DispatchOffer.findById(offerId).lean();
  if (!offer) throw notFound('Offer not found');
  if (offer.driverId.toString() !== driverId) throw forbidden('Not your offer');
  if (offer.status !== 'PENDING') throw conflict('OFFER_NOT_PENDING', 'This offer is no longer available');
  if (offer.expiresAt.getTime() < Date.now()) throw conflict('OFFER_EXPIRED', 'This offer has expired');

  const order = await Order.findById(offer.orderId).lean();
  if (!order) throw notFound('Order not found');
  if (order.status !== 'SEARCHING_DRIVER') throw conflict('ORDER_NOT_SEARCHING', 'Order is no longer searching for a driver');

  // Atomic claim: mark offer ACCEPTED, others for this order EXPIRED
  await DispatchOffer.updateOne(
    { _id: offer._id, status: 'PENDING' },
    { $set: { status: 'ACCEPTED', respondedAt: new Date() } },
  );
  await DispatchOffer.updateMany(
    { orderId: offer.orderId, status: 'PENDING', _id: { $ne: offer._id } },
    { $set: { status: 'EXPIRED' } },
  );

  const updatedOrder = await transitionOrder(
    offer.orderId.toString(),
    'DRIVER_ASSIGNED',
    'driver',
    { actorUserId: driverId, note: 'Driver accepted the offer' },
  );

  publish(`order:${updatedOrder._id.toString()}`, 'offer:cancelled', { offerId });
  publish(`driver:${driverId}`, 'offer:cancelled', { offerId });

  return updatedOrder as unknown as ApiOrder;
}

/** Driver declines an offer -> order stays in SEARCHING_DRIVER, dispatcher will advance. */
export async function declineOfferHandler(
  driverId: string,
  offerId: string,
  _reason?: string,
): Promise<void> {
  const offer = await DispatchOffer.findById(offerId).lean();
  if (!offer) throw notFound('Offer not found');
  if (offer.driverId.toString() !== driverId) throw forbidden('Not your offer');
  if (offer.status !== 'PENDING') throw conflict('OFFER_NOT_PENDING', 'This offer is no longer available');

  await DispatchOffer.updateOne(
    { _id: offer._id, status: 'PENDING' },
    { $set: { status: 'DECLINED', respondedAt: new Date() } },
  );

  const dispatcher = getDispatcher();
  await dispatcher.advance(offer.orderId.toString());
}

/** Driver releases current order -> order back to SEARCHING_DRIVER. */
export async function releaseOrderHandler(driverId: string): Promise<void> {
  const profile = await DriverProfile.findOne({ userId: new Types.ObjectId(driverId) }).lean();
  if (!profile) throw notFound('Driver profile not found');
  if (!profile.currentOrderId) throw conflict('NO_CURRENT_ORDER', 'You are not on an order');

  const order = await Order.findById(profile.currentOrderId).lean();
  if (!order) throw notFound('Order not found');

  // Only allow release from DRIVER_ASSIGNED or AT_STATION
  if (!['DRIVER_ASSIGNED', 'AT_STATION'].includes(order.status)) {
    throw conflict('CANNOT_RELEASE', `Cannot release from ${order.status}`);
  }

  await transitionOrder(
    profile.currentOrderId.toString(),
    'SEARCHING_DRIVER',
    'system',
    { note: 'Driver released the order' },
  );

  await DriverProfile.updateOne(
    { userId: new Types.ObjectId(driverId) },
    { $unset: { currentOrderId: '' } },
  );
}

/** Driver goes online with a location. */
export async function goOnlineHandler(driverId: string, lat: number, lng: number, heading?: number): Promise<void> {
  await DriverProfile.updateOne(
    { userId: new Types.ObjectId(driverId) },
    {
      $set: {
        isOnline: true,
        location: { type: 'Point', coordinates: [lng, lat] },
        locationAt: new Date(),
        heading: heading ?? null,
      },
    },
  );
}

/** Driver goes offline. */
export async function goOfflineHandler(driverId: string): Promise<void> {
  const profile = await DriverProfile.findOne({ userId: new Types.ObjectId(driverId) }).lean();
  if (profile?.currentOrderId) {
    throw conflict('HAS_CURRENT_ORDER', 'Complete or release your current order first');
  }
  await DriverProfile.updateOne(
    { userId: new Types.ObjectId(driverId) },
    { $set: { isOnline: false } },
  );
}

/** Driver location ping (also used by Socket.IO pipeline in Phase 7). */
export async function updateLocationHandler(
  driverId: string,
  lat: number,
  lng: number,
  heading?: number,
  speedKmh?: number,
  accuracyM?: number,
): Promise<void> {
  await DriverProfile.updateOne(
    { userId: new Types.ObjectId(driverId) },
    {
      $set: {
        location: { type: 'Point', coordinates: [lng, lat] },
        locationAt: new Date(),
        heading: heading ?? null,
      },
    },
  );
}

/** Get the driver's current pending offer, if any. */
export async function getMyOfferHandler(driverId: string): Promise<ApiOffer | null> {
  const offer = await getPendingOfferForDriver(driverId);
  if (!offer) return null;
  const order = await Order.findById(offer.orderId).lean();
  if (!order) return null;
  return serializeOffer(offer, order);
}

/** Sweeper job: expire stale PENDING offers and advance dispatch. */
export async function runDispatchSweeper(): Promise<{ expired: number; advanced: number }> {
  const expired = await expirePendingOffers();
  let advanced = 0;

  const searchingOrders = await Order.find({ status: 'SEARCHING_DRIVER' })
    .select({ _id: 1 })
    .lean();

  for (const o of searchingOrders) {
    await advanceDispatch(o._id.toString());
    advanced += 1;
  }

  return { expired, advanced };
}