import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { PAYOUT_STATUSES } from '../config/constants';

const payoutSchema = new Schema(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amountKobo: { type: Number, required: true, min: 0 },
    bank: {
      bankName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      accountName: { type: String, required: true },
    },
    status: { type: String, enum: PAYOUT_STATUSES, required: true },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
    note: { type: String },
  },
  { timestamps: true },
);

payoutSchema.index({ driverId: 1, createdAt: -1 });
payoutSchema.index({ status: 1, createdAt: -1 });

export type PayoutSchemaType = InferSchemaType<typeof payoutSchema>;
export type PayoutDoc = HydratedDocument<PayoutSchemaType>;

export const Payout = model('Payout', payoutSchema);
