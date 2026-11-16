import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { DEFAULT_ABUJA_CENTRE } from '../config/constants';

const centreSchema = new Schema(
  { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  { _id: false },
);

const fuelEntrySchema = new Schema(
  {
    enabled: { type: Boolean, required: true },
    retailPerLitreKobo: { type: Number, required: true, min: 0 },
    wholesalePerLitreKobo: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const surgeStepSchema = new Schema(
  {
    minRatio: { type: Number, required: true, min: 0 },
    multiplier: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const weightsSchema = new Schema(
  {
    proximity: { type: Number, required: true },
    rating: { type: Number, required: true },
    acceptance: { type: Number, required: true },
    idle: { type: Number, required: true },
  },
  { _id: false },
);

const serviceAreaSchema = new Schema(
  { centre: { type: centreSchema, required: true }, radiusKm: { type: Number, required: true, min: 1 } },
  { _id: false },
);

const fuelGroupSchema = new Schema(
  { PETROL: { type: fuelEntrySchema, required: true }, DIESEL: { type: fuelEntrySchema, required: true } },
  { _id: false },
);

const orderSchema = new Schema(
  {
    minLitres: { type: Number, required: true, min: 1 },
    maxLitres: { type: Number, required: true, min: 1 },
    canCapacityLitres: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const feesSchema = new Schema(
  {
    serviceFeeRate: { type: Number, required: true, min: 0, max: 1 },
    baseDeliveryFeeKobo: { type: Number, required: true, min: 0 },
    baseCoveredKm: { type: Number, required: true, min: 0 },
    perKmKobo: { type: Number, required: true, min: 0 },
    roundingKobo: { type: Number, required: true, min: 1 },
    vatRate: { type: Number, required: true, min: 0, max: 1 },
    cancellationFeeKobo: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const driverPaySchema = new Schema(
  { bonusRateOfServiceFee: { type: Number, required: true, min: 0, max: 1 } },
  { _id: false },
);

const surgeSchema = new Schema(
  {
    lookbackMinutes: { type: Number, required: true, min: 1 },
    maxMultiplier: { type: Number, required: true, min: 1 },
    steps: { type: [surgeStepSchema], required: true },
  },
  { _id: false },
);

const timingSchema = new Schema(
  {
    quoteTtlMinutes: { type: Number, required: true, min: 1 },
    offerTtlSeconds: { type: Number, required: true, min: 1 },
    dispatchTimeoutSeconds: { type: Number, required: true, min: 1 },
    avgSpeedKmh: { type: Number, required: true, min: 1 },
    fillSealMinutes: { type: Number, required: true, min: 0 },
    roadFactor: { type: Number, required: true, min: 1 },
    maxStationToDropoffKm: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const matchingSchema = new Schema(
  {
    weights: { type: weightsSchema, required: true },
    ringsKm: { type: [Number], required: true },
    staleLocationSeconds: { type: Number, required: true, min: 1 },
    minRating: { type: Number, required: true, min: 0, max: 5 },
    minRatingsToApply: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const cashSchema = new Schema(
  {
    enabled: { type: Boolean, required: true },
    maxOrderKobo: { type: Number, required: true, min: 0 },
    driverOwedLimitKobo: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const payoutsSchema = new Schema({ minKobo: { type: Number, required: true, min: 0 } }, { _id: false });

const pricingConfigSchema = new Schema(
  {
    key: { type: String, default: 'default', unique: true, required: true },
    serviceArea: { type: serviceAreaSchema, required: true },
    fuel: { type: fuelGroupSchema, required: true },
    order: { type: orderSchema, required: true },
    fees: { type: feesSchema, required: true },
    driverPay: { type: driverPaySchema, required: true },
    surge: { type: surgeSchema, required: true },
    timing: { type: timingSchema, required: true },
    matching: { type: matchingSchema, required: true },
    cash: { type: cashSchema, required: true },
    payouts: { type: payoutsSchema, required: true },
  },
  { timestamps: true },
);

export type PricingConfigSchemaType = InferSchemaType<typeof pricingConfigSchema>;
export type PricingConfigDoc = HydratedDocument<PricingConfigSchemaType>;

export const PricingConfig = model('PricingConfig', pricingConfigSchema);

/** Seed defaults from plan section 2. Every value here is admin-editable. */
export const DEFAULT_PRICING_CONFIG = {
  key: 'default',
  serviceArea: { centre: { ...DEFAULT_ABUJA_CENTRE }, radiusKm: 35 },
  fuel: {
    PETROL: { enabled: true, retailPerLitreKobo: 65000, wholesalePerLitreKobo: 60000 },
    DIESEL: { enabled: true, retailPerLitreKobo: 100000, wholesalePerLitreKobo: 95000 },
  },
  order: { minLitres: 10, maxLitres: 50, canCapacityLitres: 25 },
  fees: {
    serviceFeeRate: 0.175,
    baseDeliveryFeeKobo: 50000,
    baseCoveredKm: 2,
    perKmKobo: 10000,
    roundingKobo: 1000,
    vatRate: 0,
    cancellationFeeKobo: 50000,
  },
  driverPay: { bonusRateOfServiceFee: 0.1 },
  surge: {
    lookbackMinutes: 10,
    maxMultiplier: 1.5,
    steps: [
      { minRatio: 1.5, multiplier: 1.2 },
      { minRatio: 2, multiplier: 1.35 },
      { minRatio: 3, multiplier: 1.5 },
    ],
  },
  timing: {
    quoteTtlMinutes: 10,
    offerTtlSeconds: 30,
    dispatchTimeoutSeconds: 180,
    avgSpeedKmh: 20,
    fillSealMinutes: 8,
    roadFactor: 1.3,
    maxStationToDropoffKm: 15,
  },
  matching: {
    weights: { proximity: 0.5, rating: 0.2, acceptance: 0.15, idle: 0.15 },
    ringsKm: [3, 6, 10],
    staleLocationSeconds: 60,
    minRating: 3.0,
    minRatingsToApply: 10,
  },
  cash: { enabled: true, maxOrderKobo: 3000000, driverOwedLimitKobo: 10000000 },
  payouts: { minKobo: 200000 },
} as const;
