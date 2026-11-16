import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { pointSchema } from './address.model';

const locationPingSchema = new Schema(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    location: { type: pointSchema, required: true },
    at: { type: Date, required: true },
    speedKmh: { type: Number },
    accuracyM: { type: Number },
  },
  { timestamps: true },
);

locationPingSchema.index({ driverId: 1, at: -1 });
// Breadcrumbs are kept for 7 days.
locationPingSchema.index({ at: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

export type LocationPingSchemaType = InferSchemaType<typeof locationPingSchema>;
export type LocationPingDoc = HydratedDocument<LocationPingSchemaType>;

export const LocationPing = model('LocationPing', locationPingSchema);
