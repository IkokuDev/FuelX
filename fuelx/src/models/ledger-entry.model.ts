import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { LEDGER_ACCOUNTS, LEDGER_TYPES } from '../config/constants';

const ledgerEntrySchema = new Schema(
  {
    account: { type: String, enum: LEDGER_ACCOUNTS, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    amountKobo: { type: Number, required: true },
    type: { type: String, enum: LEDGER_TYPES, required: true },
    memo: { type: String },
  },
  { timestamps: true },
);

// Append-only. The partial unique index makes settlement idempotent per order,
// while leaving top-ups and other order-less rows unconstrained.
ledgerEntrySchema.index(
  { orderId: 1, type: 1, account: 1, ownerId: 1 },
  { unique: true, partialFilterExpression: { orderId: { $exists: true } } },
);
ledgerEntrySchema.index({ ownerId: 1, createdAt: -1 });

export type LedgerEntrySchemaType = InferSchemaType<typeof ledgerEntrySchema>;
export type LedgerEntryDoc = HydratedDocument<LedgerEntrySchemaType>;

export const LedgerEntry = model('LedgerEntry', ledgerEntrySchema);
