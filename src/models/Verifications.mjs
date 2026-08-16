import mongoose from 'mongoose';
import { VerificationStatus } from './enums/VerificationStatus.mjs';

const verificationSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
    },
    verifiedAt: { type: Date },
  },
  { timestamps: true },
);

export const Verification = mongoose.model('Verification', verificationSchema);
