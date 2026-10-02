import mongoose from 'mongoose';
import { BookingStatus } from './enums/BookingStatus.mjs';

const bookingSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    bookingDate: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING_PAYMENT,
    },
    amount: { type: Number, required: true },
    commissionAmount: { type: Number, required: true, default: 0 },

    // --- Provisional hold bookkeeping ---
    //
    // expiresAt     - when this booking stops holding the room. Extended (but
    //                 never past hardExpiresAt) when a payment goes in flight.
    // hardExpiresAt - absolute ceiling set at creation. A hold can never be
    //                 extended beyond it.
    // paymentInitiatedAt - set when a payment is first sent to the provider.
    // expiredAt     - when the release sweeper actually closed this hold out.
    expiresAt: { type: Date, default: null },
    hardExpiresAt: { type: Date, default: null },
    paymentInitiatedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The release sweeper scans hold-subject statuses by expiry. Indexing status
// and expiresAt together keeps that a single ranged query rather than a scan.
bookingSchema.index({ status: 1, expiresAt: 1 });
bookingSchema.index({ roomId: 1, status: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
