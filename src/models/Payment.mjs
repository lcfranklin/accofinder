import mongoose from 'mongoose';
import { PaymentStatus } from './enums/PaymentStatus.mjs';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.INITIATED,
    },
    transactionRef: { type: String, required: true, unique: true },
    payoutStatus: { type: String, required: true, default: 'Pending' },
    payoutDate: { type: Date },
    paidAt: { type: Date },
    // Reconciliation tracking
    lastCheckedAt: { type: Date },
    reconcileAttempts: { type: Number, default: 0 },
    failureReason: { type: String },
    failedAt: { type: Date },
    // Optional provider response snapshot for audit
    lastProviderStatus: { type: String },
    lastProviderResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

paymentSchema.index({ status: 1, createdAt: 1 });
paymentSchema.index({ bookingId: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
