import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { FUEL_TYPES } from '../config/constants';
import { pointSchema } from './address.model';

const stationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    location: { type: pointSchema, required: true },
    isOpen: { type: Boolean, default: true, required: true },
    fuelTypes: { type: [String], enum: FUEL_TYPES, required: true },
    contactPhone: { type: String, trim: true },
  },
  { timestamps: true },
);

stationSchema.index({ location: '2dsphere' });

export type StationSchemaType = InferSchemaType<typeof stationSchema>;
export type StationDoc = HydratedDocument<StationSchemaType>;

export const Station = model('Station', stationSchema);
