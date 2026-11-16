import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { USER_ROLES, USER_STATUSES } from '../config/constants';

const pushSubscriptionSchema = new Schema(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    role: { type: String, enum: USER_ROLES, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: USER_STATUSES, default: 'active', required: true },
    walletBalanceKobo: { type: Number, default: 0, min: 0, required: true },
    pushSubscriptions: { type: [pushSubscriptionSchema], default: [] },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });

export type UserSchemaType = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserSchemaType>;

export const User = model('User', userSchema);
