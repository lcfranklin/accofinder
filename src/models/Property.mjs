import mongoose from 'mongoose';
import { PropertyType } from './enums/PropertyType.mjs';

const physicalAddressSchema = new mongoose.Schema(
  {
    district: { type: String, trim: true },
    village: { type: String, trim: true },
  },
  { _id: false },
);

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    price: { type: Number, default: 0 },

    propertyType: {
      type: String,
      enum: Object.values(PropertyType),
      default: PropertyType.WHOLE,
      uppercase: true,
    },

    physicalAddress: { type: physicalAddressSchema, default: () => ({}) },

    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'DRAFT'],
      default: 'PENDING',
    },

    verificationReason: { type: String, trim: true, default: '' },

    // Admin user who approved this listing (VERIFIED). Stores a reference to
    // the User plus a denormalized name so clients can show "approved by"
    // without an extra users round-trip. Cleared when the listing moves away
    // from VERIFIED.
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedByName: { type: String, trim: true, default: '' },

    amenities: { type: [String], default: [] },

    landlord: { type: String, trim: true },
    landlordPhone: { type: String, trim: true },

    isActive: { type: Boolean, default: true },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    media: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],
  },
  { timestamps: true },
);

export const Property = mongoose.model('Property', propertySchema);
