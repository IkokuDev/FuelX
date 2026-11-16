import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) => v.length === 2,
        message: 'coordinates must be [lng, lat]',
      },
    },
  },
  { _id: false },
);

const addressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    location: { type: pointSchema, required: true },
    contactName: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

addressSchema.index({ userId: 1, createdAt: -1 });

export type AddressSchemaType = InferSchemaType<typeof addressSchema>;
export type AddressDoc = HydratedDocument<AddressSchemaType>;

export const Address = model('Address', addressSchema);
export { pointSchema };
