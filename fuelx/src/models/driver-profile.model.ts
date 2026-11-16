import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { APPROVAL_STATUSES, DOCUMENT_KINDS, VEHICLE_TYPES } from '../config/constants';
import { pointSchema } from './address.model';

const vehicleSchema = new Schema(
  {
    type: { type: String, enum: VEHICLE_TYPES, required: true },
    plate: { type: String, required: true, trim: true, uppercase: true },
    model: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    maxLitres: { type: Number, required: true, min: 1, default: 50 },
  },
  { _id: false },
);

const documentSchema = new Schema(
  {
    kind: { type: String, enum: DOCUMENT_KINDS, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

const statsSchema = new Schema(
  {
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    offersReceived: { type: Number, default: 0, min: 0 },
    offersAccepted: { type: Number, default: 0, min: 0 },
    deliveries: { type: Number, default: 0, min: 0 },
    lastDeliveredAt: { type: Date },
  },
  { _id: false },
);

const driverProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    approvalStatus: { type: String, enum: APPROVAL_STATUSES, default: 'pending', required: true },
    vehicle: { type: vehicleSchema },
    documents: { type: [documentSchema], default: [] },
    isOnline: { type: Boolean, default: false, required: true },
    location: { type: pointSchema },
    locationAt: { type: Date },
    heading: { type: Number },
    currentOrderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    stats: { type: statsSchema, default: () => ({}) },
    earningsBalanceKobo: { type: Number, default: 0, min: 0, required: true },
    cashOwedKobo: { type: Number, default: 0, min: 0, required: true },
  },
  { timestamps: true },
);

driverProfileSchema.index({ location: '2dsphere' });
driverProfileSchema.index({ isOnline: 1, approvalStatus: 1, currentOrderId: 1 });

export type DriverProfileSchemaType = InferSchemaType<typeof driverProfileSchema>;
export type DriverProfileDoc = HydratedDocument<DriverProfileSchemaType>;

export const DriverProfile = model('DriverProfile', driverProfileSchema);
