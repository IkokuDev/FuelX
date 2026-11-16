import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import {
  FUEL_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  TRANSITION_ACTORS,
} from '../config/constants';
import { pointSchema } from './address.model';
import { priceBreakdownSchema } from './quote.model';

const pickupSchema = new Schema(
  {
    name: { type: String, required: true },
    location: { type: pointSchema, required: true },
  },
  { _id: false },
);

const orderDropoffSchema = new Schema(
  {
    addressText: { type: String, required: true },
    landmark: { type: String },
    location: { type: pointSchema, required: true },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
  },
  { _id: false },
);

const orderPaymentSchema = new Schema(
  {
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    status: { type: String, enum: PAYMENT_STATUSES, required: true },
    reference: { type: String },
    paidAt: { type: Date },
    refundedKobo: { type: Number, default: 0, required: true },
  },
  { _id: false },
);

const statusHistorySchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true },
    byRole: { type: String, enum: TRANSITION_ACTORS, required: true },
    byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
  },
  { _id: false },
);

const dispatchSchema = new Schema(
  {
    startedAt: { type: Date },
    ringIndex: { type: Number, default: 0, required: true },
    lockedUntil: { type: Date },
    excludedDriverIds: { type: [Schema.Types.ObjectId], default: [] },
    currentOfferId: { type: Schema.Types.ObjectId, ref: 'DispatchOffer' },
  },
  { _id: false },
);

const orderSealSchema = new Schema(
  {
    sealId: { type: Schema.Types.ObjectId, ref: 'Seal', required: true },
    code: { type: String, required: true },
  },
  { _id: false },
);

const sealCheckSchema = new Schema(
  {
    intact: { type: Boolean, required: true },
    notes: { type: String },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const deliverySchema = new Schema(
  {
    otpSalt: { type: String },
    otpAttempts: { type: Number, default: 0, required: true },
    otpVerifiedAt: { type: Date },
  },
  { _id: false },
);

const timesSchema = new Schema(
  {
    assignedAt: { type: Date },
    atStationAt: { type: Date },
    sealedAt: { type: Date },
    enRouteAt: { type: Date },
    arrivedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { _id: false },
);

const cancelSchema = new Schema(
  {
    by: { type: String, enum: TRANSITION_ACTORS, required: true },
    reason: { type: String, required: true },
    feeKobo: { type: Number, default: 0, required: true },
  },
  { _id: false },
);

const disputeSchema = new Schema(
  {
    open: { type: Boolean, default: false, required: true },
    reason: { type: String, required: true },
    openedAt: { type: Date, required: true },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    outcome: { type: String, enum: ['REFUND', 'DELIVERED_OK'] },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    fuelType: { type: String, enum: FUEL_TYPES, required: true },
    litres: { type: Number, required: true },
    canCount: { type: Number, required: true },
    stationId: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote', required: true },
    pickup: { type: pickupSchema, required: true },
    dropoff: { type: orderDropoffSchema, required: true },
    pricing: { type: priceBreakdownSchema, required: true },
    payment: { type: orderPaymentSchema, required: true },
    status: { type: String, enum: ORDER_STATUSES, required: true },
    statusHistory: { type: [statusHistorySchema], default: [] },
    dispatch: { type: dispatchSchema, default: () => ({}) },
    seals: { type: [orderSealSchema], default: [] },
    sealPhotoUrls: { type: [String], default: [] },
    sealCheck: { type: sealCheckSchema },
    delivery: { type: deliverySchema, default: () => ({}) },
    times: { type: timesSchema, default: () => ({}) },
    cancel: { type: cancelSchema },
    dispute: { type: disputeSchema },
  },
  { timestamps: true },
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ driverId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'dispatch.lockedUntil': 1 });

export type OrderSchemaType = InferSchemaType<typeof orderSchema>;
export type OrderDoc = HydratedDocument<OrderSchemaType>;

export const Order = model('Order', orderSchema);
