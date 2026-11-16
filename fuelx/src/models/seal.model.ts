import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { SEAL_STATUSES } from '../config/constants';

const sealSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    batchId: { type: String, required: true },
    stationId: { type: Schema.Types.ObjectId, ref: 'Station' },
    status: { type: String, enum: SEAL_STATUSES, default: 'UNUSED', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    appliedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    appliedAt: { type: Date },
    photoUrl: { type: String },
  },
  { timestamps: true },
);

sealSchema.index({ batchId: 1, status: 1 });
sealSchema.index({ orderId: 1 });

export type SealSchemaType = InferSchemaType<typeof sealSchema>;
export type SealDoc = HydratedDocument<SealSchemaType>;

export const Seal = model('Seal', sealSchema);
