import { Types } from 'mongoose';
import { Address } from '../../models/address.model';
import { fromGeoPoint, toGeoPoint } from '../../lib/geo';
import { notFound } from '../../lib/errors';
import type { CreateAddressInput, UpdateAddressInput } from './addresses.schemas';

export interface ApiAddress {
  id: string;
  label: string;
  line1: string;
  landmark?: string;
  lat: number;
  lng: number;
  contactName?: string;
  contactPhone?: string;
  isDefault: boolean;
}

interface AddressLike {
  _id: Types.ObjectId;
  label: string;
  line1: string;
  landmark?: string | null;
  location: { type: 'Point'; coordinates: [number, number] };
  contactName?: string | null;
  contactPhone?: string | null;
  isDefault?: boolean | null;
}

export function toApiAddress(a: AddressLike): ApiAddress {
  const { lat, lng } = fromGeoPoint({ type: 'Point', coordinates: a.location.coordinates });
  return {
    id: a._id.toString(),
    label: a.label,
    line1: a.line1,
    landmark: a.landmark ?? undefined,
    lat,
    lng,
    contactName: a.contactName ?? undefined,
    contactPhone: a.contactPhone ?? undefined,
    isDefault: Boolean(a.isDefault),
  };
}

export async function listAddresses(userId: string): Promise<ApiAddress[]> {
  const rows = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
  return rows.map((r) => toApiAddress(r as unknown as AddressLike));
}

export async function createAddress(
  userId: string,
  input: CreateAddressInput,
): Promise<ApiAddress> {
  if (input.isDefault) {
    await Address.updateMany({ userId }, { $set: { isDefault: false } });
  }
  const count = await Address.countDocuments({ userId });
  const doc = await Address.create({
    userId,
    label: input.label,
    line1: input.line1,
    landmark: input.landmark,
    location: toGeoPoint({ lat: input.lat, lng: input.lng }),
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    isDefault: input.isDefault ?? count === 0,
  });
  return toApiAddress(doc as unknown as AddressLike);
}

export async function updateAddress(
  userId: string,
  id: string,
  input: UpdateAddressInput,
): Promise<ApiAddress> {
  const existing = await Address.findOne({ _id: id, userId });
  if (!existing) throw notFound('Address not found');

  if (input.isDefault) {
    await Address.updateMany({ userId }, { $set: { isDefault: false } });
  }

  const set: Record<string, unknown> = {};
  if (input.label !== undefined) set.label = input.label;
  if (input.line1 !== undefined) set.line1 = input.line1;
  if (input.landmark !== undefined) set.landmark = input.landmark;
  if (input.contactName !== undefined) set.contactName = input.contactName;
  if (input.contactPhone !== undefined) set.contactPhone = input.contactPhone;
  if (input.isDefault !== undefined) set.isDefault = input.isDefault;
  if (input.lat !== undefined && input.lng !== undefined) {
    set.location = toGeoPoint({ lat: input.lat, lng: input.lng });
  }

  const updated = await Address.findOneAndUpdate({ _id: id, userId }, { $set: set }, { new: true });
  if (!updated) throw notFound('Address not found');
  return toApiAddress(updated as unknown as AddressLike);
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  const res = await Address.deleteOne({ _id: id, userId });
  if (res.deletedCount === 0) throw notFound('Address not found');
}
