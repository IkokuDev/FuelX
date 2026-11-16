import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { OFFER_STATUSES } from '../config/constants';

const dispatchOfferSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ringIndex: { type: Number, required: true },
    rank: { type: Number, required: true },
    score: { type: Number, required: true },
    distanceToStationKm: { type: Number, required: true },
    status: { type: String, enum: OFFER_STATUSES, required: true },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date },
  },
  { timestamps: true },
);

dispatchOfferSchema.index({ orderId: 1, driverId: 1 }, { unique: true });
dispatchOfferSchema.index({ status: 1, expiresAt: 1 });
dispatchOfferSchema.index({ driverId: 1, status: 1 });

export type DispatchOfferSchemaType = InferSchemaType<typeof dispatchOfferSchema>;
export type DispatchOfferDoc = HydratedDocument<DispatchOfferSchemaType>;

export const DispatchOffer = model('DispatchOffer', dispatchOfferSchema);
