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
  },
  { timestamps: true },
);

export const Payment = mongoose.model('Payment', paymentSchema);
