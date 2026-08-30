import mongoose from 'mongoose';
import { DisputeStatus } from './enums/DisputeStatus.mjs';

const disputeSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    issue: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
    },
  },
  { timestamps: true },
);

export const Dispute = mongoose.model('Dispute', disputeSchema);
