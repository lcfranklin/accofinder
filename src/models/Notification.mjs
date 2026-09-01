import mongoose from 'mongoose';
import { UserRole } from './enums/UserRole.mjs';

const NOTIFICATION_KINDS = Object.freeze({
  ADMIN: 'ADMIN',
  CLIENT: 'CLIENT',
  AGENT: 'AGENT',
  SYSTEM: 'SYSTEM',
});

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientRole: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    kind: {
      type: String,
      enum: Object.values(NOTIFICATION_KINDS),
      required: true,
    },
    title: { type: String, default: '' },
    message: { type: String, required: true },
    announcement: { type: Boolean, default: false },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientRole: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);
export { NOTIFICATION_KINDS };