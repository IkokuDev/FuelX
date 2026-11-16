import type { Types } from 'mongoose';
import { Station } from '../../models/station.model';
import { fromGeoPoint, haversineKm, toGeoPoint, type LatLng } from '../../lib/geo';
import { notFound } from '../../lib/errors';
import type { FuelType } from '../../config/constants';
import type { CreateStationInput, UpdateStationInput } from './stations.schemas';

export interface ApiStation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isOpen: boolean;
  fuelTypes: FuelType[];
  contactPhone?: string;
}

interface StationLike {
  _id: Types.ObjectId;
  name: string;
  address: string;
  location: { type: 'Point'; coordinates: [number, number] };
  isOpen: boolean;
  fuelTypes: string[];
  contactPhone?: string | null;
}

export function toApiStation(s: StationLike): ApiStation {
  const { lat, lng } = fromGeoPoint({ type: 'Point', coordinates: s.location.coordinates });
  return {
    id: s._id.toString(),
    name: s.name,
    address: s.address,
    lat,
    lng,
    isOpen: s.isOpen,
    fuelTypes: s.fuelTypes as FuelType[],
    contactPhone: s.contactPhone ?? undefined,
  };
}

export async function listStations(): Promise<ApiStation[]> {
  const rows = await Station.find().sort({ name: 1 }).lean();
  return rows.map((r) => toApiStation(r as unknown as StationLike));
}

export async function createStation(input: CreateStationInput): Promise<ApiStation> {
  const doc = await Station.create({
    name: input.name,
    address: input.address,
    location: toGeoPoint({ lat: input.lat, lng: input.lng }),
    isOpen: input.isOpen ?? true,
    fuelTypes: input.fuelTypes,
    contactPhone: input.contactPhone,
  });
  return toApiStation(doc as unknown as StationLike);
}

export async function updateStation(id: string, input: UpdateStationInput): Promise<ApiStation> {
  const set: Record<string, unknown> = {};
  if (input.name !== undefined) set.name = input.name;
  if (input.address !== undefined) set.address = input.address;
  if (input.isOpen !== undefined) set.isOpen = input.isOpen;
  if (input.fuelTypes !== undefined) set.fuelTypes = input.fuelTypes;
  if (input.contactPhone !== undefined) set.contactPhone = input.contactPhone;
  if (input.lat !== undefined && input.lng !== undefined) {
    set.location = toGeoPoint({ lat: input.lat, lng: input.lng });
  }
  const doc = await Station.findByIdAndUpdate(id, { $set: set }, { new: true });
  if (!doc) throw notFound('Station not found');
  return toApiStation(doc as unknown as StationLike);
}

export async function getStationById(id: string): Promise<ApiStation> {
  const doc = await Station.findById(id).lean();
  if (!doc) throw notFound('Station not found');
  return toApiStation(doc as unknown as StationLike);
}

/** Nearest open station that stocks the fuel type, by haversine to the drop-off. */
export async function findNearestOpenStation(
  fuelType: FuelType,
  dropoff: LatLng,
): Promise<{ station: ApiStation; distanceKm: number } | null> {
  const candidates = await Station.find({ isOpen: true, fuelTypes: fuelType }).lean();
  let best: { station: ApiStation; distanceKm: number } | null = null;
  for (const row of candidates) {
    const api = toApiStation(row as unknown as StationLike);
    const distanceKm = haversineKm({ lat: api.lat, lng: api.lng }, dropoff);
    if (!best || distanceKm < best.distanceKm) best = { station: api, distanceKm };
  }
  return best;
}
