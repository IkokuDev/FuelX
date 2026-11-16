import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { PAYMENT_PROVIDER_STATUSES, PAYMENT_PURPOSES } from '../config/constants';

const paymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    purpose: { type: String, enum: PAYMENT_PURPOSES, required: true },
    provider: { type: String, enum: ['mock', 'paystack'], required: true },
    reference: { type: String, required: true, unique: true },
    amountKobo: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PAYMENT_PROVIDER_STATUSES, required: true },
    authorizationUrl: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

export type PaymentSchemaType = InferSchemaType<typeof paymentSchema>;
export type PaymentDoc = HydratedDocument<PaymentSchemaType>;

export const Payment = model('Payment', paymentSchema);
