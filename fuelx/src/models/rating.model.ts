import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const ratingSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);

ratingSchema.index({ driverId: 1, createdAt: -1 });

export type RatingSchemaType = InferSchemaType<typeof ratingSchema>;
export type RatingDoc = HydratedDocument<RatingSchemaType>;

export const Rating = model('Rating', ratingSchema);
