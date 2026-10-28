import mongoose from 'mongoose';
import { Payment } from '../models/Payment.mjs';
import { Booking } from '../models/Booking.mjs';
import { Room } from '../models/Room.mjs';
import { Property } from '../models/Property.mjs';
import { PaymentStatus } from '../models/enums/PaymentStatus.mjs';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';
import paychangu from '../utils/paychangu.mjs';
import { releaseHold } from './holdService.mjs';
import { createNotification } from './notificationService.mjs';
import {
  PAYMENT_VERIFY_DELAY_MS,
  PAYMENT_RECONCILE_INTERVAL_MS,
  PAYMENT_REVIEW_AFTER_MS,
  PAYMENT_ABANDON_AFTER_MS,
  PAYMENT_MAX_RECONCILE_ATTEMPTS,
  PAYMENT_RECONCILE_ENABLED,
} from '../config/paymentConfig.mjs';

const CURRENCY = process.env.CURRENCY || 'MWK';

const toLower = (v) => String(v || '').toLowerCase();

const classifyProviderStatus = (verifyResponse) => {
  const status =
    verifyResponse?.status ||
    verifyResponse?.data?.status ||
    verifyResponse?.transaction_status ||
    verifyResponse?.data?.transaction_status ||
    verifyResponse?.charge_status;

  const s = toLower(status);
  if (
    s.includes('success') ||
    s.includes('complete') ||
    s.includes('paid') ||
    s === 'success'
  ) {
    return 'success';
  }
  if (
    s.includes('fail') ||
    s.includes('cancel') ||
    s.includes('expire') ||
    s.includes('declin') ||
    s.includes('reject') ||
    s.includes('error')
  ) {
    return 'failed';
  }
  if (s.includes('pend') || s.includes('process') || s.includes('initi')) {
    return 'pending';
  }
  if (s.includes('not_found') || s.includes('not found') || s === '404') {
    return 'not_found';
  }
  return 'unknown';
};

const verifyWithProvider = async (transactionRef) => {
  try {
    if (!process.env.PAYCHANGU_SECRET_KEY) return { status: 'unknown' };
    paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);
    const verifyResponse = await paychangu.verifyDirectChargeStatus({
      chargeId: transactionRef,
    });
    const classification = classifyProviderStatus(verifyResponse);
    return { status: classification, raw: verifyResponse };
  } catch (err) {
    const msg = toLower(err?.message || '');
    if (msg.includes('not found') || msg.includes('404')) {
      return { status: 'not_found', raw: err?.response?.data || err?.message };
    }
    return { status: 'unknown', raw: err?.message };
  }
};

const confirmFromReconciliation = async (payment) => {
  if (payment.status !== PaymentStatus.INITIATED) return;
  const booking = await Booking.findById(payment.bookingId);
  if (!booking) return;
  if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PAID) {
    // Already confirmed elsewhere, just mark payment
    if (payment.status === PaymentStatus.INITIATED) {
      payment.status = PaymentStatus.SUCCESS;
      payment.paidAt = payment.paidAt || new Date();
      await payment.save();
    }
    return;
  }

  booking.status = BookingStatus.CONFIRMED;
  booking.expiresAt = null;
  await booking.save();

  payment.status = PaymentStatus.SUCCESS;
  payment.paidAt = payment.paidAt || new Date();
  await payment.save();

  // Clear hold if room still held by this booking
  try {
    if (booking.roomId || booking.bookableItemId) {
      const roomId = booking.roomId || booking.bookableItemId;
      await releaseHold({ roomId, bookingId: booking._id });
    }
  } catch (e) {
    console.error('[paymentReconcile] releaseHold after late success failed:', e.message);
  }

  try {
    if (booking.clientId) {
      await createNotification({
        recipientRole: 'CLIENT',
        recipientId: booking.clientId,
        kind: 'BOOKING',
        title: 'Booking confirmed',
        message: 'Your payment was confirmed and your booking is confirmed.',
        senderId: booking.clientId,
        bookingId: booking._id,
      });
    }
  } catch (e) {
    console.error('[paymentReconcile] notify client failed:', e.message);
  }
};

const failPaymentAndRelease = async (payment, reason) => {
  if (payment.status !== PaymentStatus.INITIATED) return;
  const booking = await Booking.findById(payment.bookingId);
  if (!booking) return;
  if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PAID) {
    // Don't touch confirmed bookings
    if (payment.status === PaymentStatus.INITIATED) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = reason;
      payment.failedAt = new Date();
      await payment.save();
    }
    return;
  }

  payment.status = PaymentStatus.FAILED;
  payment.failureReason = reason;
  payment.failedAt = new Date();
  await payment.save();

  // Mark booking as failed/expired appropriately and release hold
  if (booking.status === BookingStatus.PAYMENT_IN_FLIGHT || booking.status === BookingStatus.PENDING_PAYMENT || booking.status === BookingStatus.FAILED) {
    booking.status = BookingStatus.FAILED;
    booking.expiresAt = null;
    await booking.save();
  }

  try {
    const roomId = booking.roomId || booking.bookableItemId;
    if (roomId) {
      await releaseHold({ roomId, bookingId: booking._id });
    }
  } catch (e) {
    console.error('[paymentReconcile] releaseHold after fail failed:', e.message);
  }

  try {
    if (booking.clientId) {
      await createNotification({
        recipientRole: 'CLIENT',
        recipientId: booking.clientId,
        kind: 'BOOKING',
        title: 'Payment failed or expired',
        message: 'Your payment could not be confirmed. The room is available again.',
        senderId: booking.clientId,
        bookingId: booking._id,
      });
    }
  } catch (e) {
    console.error('[paymentReconcile] notify client failed:', e.message);
  }
};

export const reconcileStalePayments = async ({ limit = 50 } = {}) => {
  if (!PAYMENT_RECONCILE_ENABLED) return { checked: 0, confirmed: 0, failed: 0, reviewed: 0 };
  const now = new Date();
  const verifyCutoff = new Date(now.getTime() - PAYMENT_VERIFY_DELAY_MS);
  const reviewCutoff = new Date(now.getTime() - PAYMENT_REVIEW_AFTER_MS);
  const abandonCutoff = new Date(now.getTime() - PAYMENT_ABANDON_AFTER_MS);

  const payments = await Payment.find({
    status: PaymentStatus.INITIATED,
    createdAt: { $lt: verifyCutoff },
    reconcileAttempts: { $lt: PAYMENT_MAX_RECONCILE_ATTEMPTS },
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  let checked = 0,
    confirmed = 0,
    failed = 0,
    reviewed = 0;

  for (const p of payments) {
    try {
      checked += 1;
      p.lastCheckedAt = now;
      p.reconcileAttempts = (p.reconcileAttempts || 0) + 1;
      await p.save();

      const verification = await verifyWithProvider(p.transactionRef);
      p.lastProviderStatus = verification.status;
      p.lastProviderResponse = verification.raw || null;
      await p.save();

      if (verification.status === 'success') {
        await confirmFromReconciliation(p);
        confirmed += 1;
        continue;
      }

      if (
        verification.status === 'failed' ||
        verification.status === 'cancelled' ||
        verification.status === 'not_found'
      ) {
        // Be conservative: if it's very old and provider says failed/not found -> fail
        if (p.createdAt < abandonCutoff) {
          await failPaymentAndRelease(p, 'provider_failed_or_expired');
          failed += 1;
          continue;
        }
        // Otherwise just mark reason and let it continue/retry or review
        p.failureReason = `provider_${verification.status}`;
        await p.save();
        reviewed += 1;
        continue;
      }

      if (verification.status === 'pending') {
        if (p.createdAt < abandonCutoff) {
          // Still pending after 72h and provider can't confirm success -> flag for admin review, do NOT auto-fail blindly
          // Only auto-fail if provider explicitly says failed/not found above
          p.failureReason = 'pending_over_72h_needs_review';
          await p.save();
          reviewed += 1;
          continue;
        }
        if (p.createdAt < reviewCutoff) {
          p.failureReason = 'pending_over_24h_needs_review';
          await p.save();
          reviewed += 1;
        }
        continue;
      }

      // unknown - be conservative
      if (p.createdAt < abandonCutoff) {
        p.failureReason = 'unknown_over_72h_needs_review';
        await p.save();
        reviewed += 1;
      }
    } catch (err) {
      console.error(`[paymentReconcile] error for payment ${p._id}:`, err.message);
    }
  }

  if (checked > 0) {
    console.log(
      `[paymentReconcile] checked=${checked} confirmed=${confirmed} failed=${failed} reviewed=${reviewed}`,
    );
  }

  return { checked, confirmed, failed, reviewed };
};

let intervalHandle = null;

export const startPaymentReconciliationJob = () => {
  if (!PAYMENT_RECONCILE_ENABLED) {
    console.log('[paymentReconcile] reconciliation disabled via PAYMENT_RECONCILE_ENABLED=false');
    return null;
  }
  if (intervalHandle) return intervalHandle;

  const run = async () => {
    try {
      await reconcileStalePayments();
    } catch (err) {
      console.error('[paymentReconcile] sweep failed:', err.message);
    }
  };

  run();
  intervalHandle = setInterval(run, PAYMENT_RECONCILE_INTERVAL_MS);
  intervalHandle.unref?.();
  console.log(
    `[paymentReconcile] started (interval=${PAYMENT_RECONCILE_INTERVAL_MS}ms, verifyDelay=${PAYMENT_VERIFY_DELAY_MS}ms, abandonAfter=${PAYMENT_ABANDON_AFTER_MS}ms)`,
  );
  return intervalHandle;
};

export const stopPaymentReconciliationJob = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
};
