import { Types } from 'mongoose';
import { Quote } from '../../models/quote.model';
import { DriverProfile } from '../../models/driver-profile.model';
import { AppError } from '../../lib/errors';
import { haversineKm, toGeoPoint, type LatLng } from '../../lib/geo';
import { roundTo } from '../../lib/money';
import { getConfig } from '../pricing/pricing.service';
import { calculatePrice, toPublicBreakdown } from '../pricing/pricing.engine';
import { getSurgeMultiplier } from '../pricing/surge';
import { estimateEtaMinutes } from '../pricing/eta';
import { findNearestOpenStation } from '../stations/stations.service';
import { getRoutingProvider } from '../../providers/routing';
import type { PublicPriceBreakdown } from '../pricing/pricing.types';
import type { CreateQuoteInput } from './quotes.schemas';

export interface ApiQuote {
  quoteId: string;
  expiresAt: string;
  station: { id: string; name: string };
  litres: number;
  fuelType: string;
  etaMinutes: number;
  breakdown: PublicPriceBreakdown;
}

/** Minutes for the closest online, idle, approved driver to reach the station. */
async function driverToStationMinutes(station: LatLng, roadFactor: number, avgSpeedKmh: number): Promise<number> {
  const driver = await DriverProfile.findOne({
    isOnline: true,
    approvalStatus: 'approved',
    currentOrderId: null,
    location: { $ne: null },
  })
    .select({ location: 1 })
    .lean();

  if (!driver?.location) return 15;
  const coords = driver.location.coordinates;
  const km = haversineKm({ lng: coords[0], lat: coords[1] }, station) * roadFactor;
  return (km / avgSpeedKmh) * 60;
}

/**
 * Create a locked quote (plan section 10). Chooses the nearest open station,
 * prices with the current config and surge, and stores nothing else.
 */
export async function createQuote(userId: string, input: CreateQuoteInput): Promise<ApiQuote> {
  const config = await getConfig();
  const dropoff: LatLng = { lat: input.dropoff.lat, lng: input.dropoff.lng };

  const nearest = await findNearestOpenStation(input.fuelType, dropoff);
  if (!nearest) {
    throw new AppError('NO_STATION_AVAILABLE', 422, 'No station stocks that fuel nearby');
  }
  const station = nearest.station;
  const stationPoint: LatLng = { lat: station.lat, lng: station.lng };

  const driversOnline = await DriverProfile.countDocuments({
    isOnline: true,
    approvalStatus: 'approved',
  });
  if (driversOnline === 0) {
    throw new AppError('NO_DRIVERS_ONLINE', 409, 'No drivers are online right now');
  }

  const route = await getRoutingProvider().route(stationPoint, dropoff, { roadFactor: config.timing.roadFactor });
  const distanceKm = roundTo(route.distanceKm, 0.1);

  const surgeMultiplier = await getSurgeMultiplier(config);
  const breakdown = calculatePrice(
    { fuelType: input.fuelType, litres: input.litres, distanceKm, surgeMultiplier, dropoff },
    config,
  );

  const toStation = await driverToStationMinutes(stationPoint, config.timing.roadFactor, config.timing.avgSpeedKmh);
  const etaMinutes = estimateEtaMinutes({
    driverToStationMin: toStation,
    fillSealMinutes: config.timing.fillSealMinutes,
    tripKm: distanceKm,
    avgSpeedKmh: config.timing.avgSpeedKmh,
  });

  const expiresAt = new Date(Date.now() + config.timing.quoteTtlMinutes * 60_000);
  const quote = await Quote.create({
    userId: new Types.ObjectId(userId),
    fuelType: input.fuelType,
    litres: input.litres,
    stationId: station.id,
    stationName: station.name,
    dropoff: { location: toGeoPoint(dropoff), addressText: input.dropoff.addressText },
    breakdown,
    etaMinutes,
    expiresAt,
  });

  return {
    quoteId: quote._id.toString(),
    expiresAt: expiresAt.toISOString(),
    station: { id: station.id, name: station.name },
    litres: input.litres,
    fuelType: input.fuelType,
    etaMinutes,
    breakdown: toPublicBreakdown(breakdown),
  };
}
