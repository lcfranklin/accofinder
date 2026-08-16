import mongoose from 'mongoose';
import { PropertyStatus } from './enums/PropertyStatus.mjs';

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(PropertyStatus),
      default: PropertyStatus.PENDING,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Landlord',
      required: true,
    },
  },
  { timestamps: true },
);

export const Property = mongoose.model('Property', propertySchema);
