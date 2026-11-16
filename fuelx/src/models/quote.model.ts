import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { FUEL_TYPES } from '../config/constants';
import { pointSchema } from './address.model';

export const priceBreakdownSchema = new Schema(
  {
    litres: { type: Number, required: true },
    distanceKm: { type: Number, required: true },
    surgeMultiplier: { type: Number, required: true },
    fuelUnitKobo: { type: Number, required: true },
    fuelSubtotalKobo: { type: Number, required: true },
    deliveryFeeKobo: { type: Number, required: true },
    serviceFeeKobo: { type: Number, required: true },
    vatKobo: { type: Number, required: true },
    totalKobo: { type: Number, required: true },
    driverEarningKobo: { type: Number, required: true },
    fuelCostKobo: { type: Number, required: true },
  },
  { _id: false },
);

const dropoffSchema = new Schema(
  {
    location: { type: pointSchema, required: true },
    addressText: { type: String, required: true },
  },
  { _id: false },
);

const quoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    fuelType: { type: String, enum: FUEL_TYPES, required: true },
    litres: { type: Number, required: true },
    stationId: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    stationName: { type: String, required: true },
    dropoff: { type: dropoffSchema, required: true },
    breakdown: { type: priceBreakdownSchema, required: true },
    etaMinutes: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    usedByOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true },
);

// TTL with one day of grace so a recently used quote can still be inspected.
quoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

export type QuoteSchemaType = InferSchemaType<typeof quoteSchema>;
export type QuoteDoc = HydratedDocument<QuoteSchemaType>;

export const Quote = model('Quote', quoteSchema);
