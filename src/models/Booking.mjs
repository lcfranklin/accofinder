import mongoose from 'mongoose';
import { BookingStatus } from './enums/BookingStatus.mjs';

const bookingSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookableItemType: {
      type: String,
      enum: ['Room', 'Property'],
      required: true,
      trim: true,
    },
    bookableItemId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'bookableItemType',
      required: true,
    },
    bookingDate: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
    },
    amount: { type: Number, required: true },
    commissionAmount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export const Booking = mongoose.model('Booking', bookingSchema);
