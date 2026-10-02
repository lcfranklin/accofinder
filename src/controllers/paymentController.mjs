import { asyncHandler, sendResponse, withId } from '../utils/helpers.mjs';
import { Booking } from '../models/Booking.mjs';
import { Room } from '../models/Room.mjs';
import { Payment } from '../models/Payment.mjs';
import { Property } from '../models/Property.mjs';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';
import { confirmRoom, releaseHold, isHoldActive } from '../services/holdService.mjs';
import {
  PAYMENT_IN_FLIGHT_GRACE_MS,
  HOLD_HARD_CAP_MS,
} from '../config/holdConfig.mjs';
import { v4 as uuidv4 } from 'uuid';
import paychangu from '../utils/paychangu.mjs';
import { PaymentStatus } from '../models/enums/PaymentStatus.mjs';
import { createNotification } from '../services/notificationService.mjs';
import mongoose from 'mongoose';

const CURRENCY = process.env.PAYCHANGU_CURRENCY || 'MWK';

/**
 * Push a booking's hold out by the in-flight grace period because a payment has
 * been sent to the provider.
 *
 * Two guards matter here:
 *
 *  - A booking that is already CONFIRMED/EXPIRED/CANCELLED is not resurrected.
 *  - The extension is clamped to hardExpiresAt, which was fixed at creation. A
 *    client cannot keep re-triggering payments to hold a room forever.
 *
 * The room's own holdExpiresAt is moved in the same step so the listing and the
 * booking agree on when the hold lapses.
 */
const extendHoldForPayment = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) return { holdExpiresAt: null };

  const extendable = [
    BookingStatus.PENDING_PAYMENT,
    BookingStatus.FAILED,
    BookingStatus.PAYMENT_IN_FLIGHT,
  ];

  if (!extendable.includes(booking.status)) {
    // Already settled one way or another - leave it alone.
    return { holdExpiresAt: booking.expiresAt ?? null };
  }

  const now = Date.now();
  const requested = new Date(now + PAYMENT_IN_FLIGHT_GRACE_MS);
  const hardCap = booking.hardExpiresAt
    ? new Date(booking.hardExpiresAt).getTime()
    : now + HOLD_HARD_CAP_MS;

  const nextExpiry = new Date(Math.min(requested.getTime(), hardCap));
  const stillLive =
    !booking.expiresAt || new Date(booking.expiresAt).getTime() > now;

  booking.status = BookingStatus.PAYMENT_IN_FLIGHT;
  booking.paymentInitiatedAt = booking.paymentInitiatedAt || new Date(now);
  booking.expiresAt = nextExpiry;
  await booking.save();

  // Keep the room's hold expiry in step, but only while this booking still
  // holds it. If the hold already lapsed and the sweeper ran, the room may have
  // moved on and must not be dragged back into a held state.
  if (stillLive) {
    await Room.updateOne(
      { _id: booking.roomId, holdRef: booking._id },
      { $set: { holdExpiresAt: nextExpiry } },
    );
  }

  return { holdExpiresAt: nextExpiry };
};

export const processMobilePayment = asyncHandler(async (req, res) => {
  const { phoneNumber, bookingId, amount, operatorRefId } = req.body;
  const clientId = req.params.id;

  const finalBookingId = bookingId || req.params.bookingId;
  const tx_ref = uuidv4();

  const findBookingData = await Booking.findById(finalBookingId)
    .populate({
      path: 'clientId',
      select: 'firstName surname email phone',
    })
    .populate('roomId');

  if (!findBookingData) {
    return sendResponse(res, 404, false, 'Booking not found');
  }

  const client = findBookingData.clientId || {};
  const mobile = phoneNumber || client.phone;

  if (!mobile) {
    return sendResponse(
      res,
      400,
      false,
      'Phone number is required for mobile money payment',
    );
  }

  const mobile_money_operator_ref_id =
    operatorRefId || '20be6c20-adeb-4b5b-a7ba-0769820df4fb';

  paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);

  const response = await paychangu.chargeMobileMoney({
    mobile_money_operator_ref_id,
    mobile,
    amount: String(amount || findBookingData.amount || 0),
    email: client.email,
    first_name: client.firstName,
    last_name: client.surname,
    charge_id: tx_ref
  });

  const isSuccess =
    response?.status === 'success' || response?.data?.status === 'success';
  if (!response || !isSuccess) {
    throw new Error(
      response?.message || 'Mobile Money Payment was unsuccessful',
    );
  }

  const newPayment = new Payment({
    bookingId: finalBookingId,
    amount: Number(amount) || findBookingData.amount,
    method: 'mobile_money',
    status: PaymentStatus.INITIATED,
    transactionRef: tx_ref,
    payoutStatus: 'Pending',
  });

  await newPayment.save();

  // Extend the hold now that money is actually moving. Mobile money settles on
  // the provider's schedule and the app only learns the outcome when it next
  // calls GET /payments/verify/:chargeId, so without this a slow but perfectly
  // valid payment would be rejected against an already-lapsed window. Capped by
  // the booking's hardExpiresAt so the hold cannot be extended indefinitely.
  const hold = await extendHoldForPayment(finalBookingId);

  return sendResponse(res, 200, true, 'Mobile money payment was successful', {
    ...response.data,
    tx_ref,
    payment: withId(newPayment),
    bookingId: finalBookingId,
    holdExpiresAt: hold.holdExpiresAt,
  });
});

export const getSupportedMomoOperators = asyncHandler(
  async (req, res, next) => {
    paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);
    const response = await paychangu.supportedMomoOperators();

    return sendResponse(
      res,
      200,
      true,
      'Supported mobile money operators retrieved',
      response?.data,
    );
  },
);

export const verifyMobilePayment = asyncHandler(async (req, res, next) => {
  let { chargeId } = req.params;

  if (!chargeId) {
    return sendResponse(res, 400, false, 'chargeId is required in parameters');
  }

  let foundPayment = await Payment.findOne({ transactionRef: chargeId });

  // The app may pass a payment id (uuid or Mongo _id) instead of the
  // PayChangu charge id; resolve it to the stored transaction ref.
  if (!foundPayment && mongoose.Types.ObjectId.isValid(chargeId)) {
    foundPayment = await Payment.findById(chargeId);
    if (foundPayment) {
      chargeId = foundPayment.transactionRef;
    }
  }

  if (!foundPayment) {
    return sendResponse(
      res,
      200,
      true,
      'Payment verification status',
      { verification: null, payment: null },
    );
  }

  paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);
  const verifyResponse = await paychangu.verifyDirectChargeStatus({ chargeId });

  const isSuccess =
    verifyResponse?.status === 'success' ||
    verifyResponse?.data?.status === 'success';
  const amount = verifyResponse?.data?.amount;
  const currency = verifyResponse?.data?.currency || CURRENCY;

  if (isSuccess) {
    if (
      !foundPayment.amount ||
      (amount && Number(foundPayment.amount) === Number(amount)) ||
      currency === CURRENCY
    ) {
      foundPayment.status = PaymentStatus.SUCCESS;
      foundPayment.paidAt = new Date();
    } else {
      foundPayment.status = PaymentStatus.FAILED;
    }
  } else {
    foundPayment.status = PaymentStatus.FAILED;
  }

  await foundPayment.save();

  // A verified payment is what makes a booking real: the room comes off the
  // market and the hold is cleared, in one atomic step. Previously this set the
  // booking to PAID and left it there, expecting an agent to confirm it later -
  // which meant a paid booking could sit unreconciled indefinitely, and there
  // was no path from a late PAID booking to actually taking the room.
  let bookingOutcome = null;
  if (foundPayment.status === PaymentStatus.SUCCESS && foundPayment.bookingId) {
    const booking = await Booking.findById(foundPayment.bookingId);

    if (!booking) {
      bookingOutcome = { confirmed: false, reason: 'booking_missing' };
    } else if (booking.status === BookingStatus.CONFIRMED) {
      // Idempotent: re-verifying the same charge must not double-confirm.
      bookingOutcome = { confirmed: true, reason: 'already_confirmed' };
    } else if (
      [BookingStatus.CANCELLED, BookingStatus.EXPIRED].includes(booking.status)
    ) {
      // The user backed out or the hold lapsed before the money cleared.
      // The room may since have been given to someone else, so we must not
      // confirm blindly - report it for reconciliation and refund instead.
      const room = await Room.findById(booking.roomId).select(
        'available holdRef holdExpiresAt',
      );
      const roomStillFree =
        room && room.available === true && !isHoldActive(room);

      if (roomStillFree) {
        await confirmRoom({
          roomId: booking.roomId,
          bookingId: booking._id,
        });
        booking.status = BookingStatus.CONFIRMED;
        booking.expiresAt = null;
        await booking.save();
        bookingOutcome = {
          confirmed: true,
          reason: 'hold_lapsed_unclaimed',
        };
      } else {
        bookingOutcome = { confirmed: false, reason: 'room_taken' };
      }
    } else {
      const outcome = await confirmRoom({
        roomId: booking.roomId,
        bookingId: booking._id,
      });

      if (outcome.confirmed) {
        booking.status = BookingStatus.CONFIRMED;
        booking.expiresAt = null;
        await booking.save();
        bookingOutcome = { confirmed: true, reason: outcome.reason };
      } else {
        // Paid, but the room is gone. Do not confirm: that would double-book
        // it. Flag it so support can refund.
        bookingOutcome = { confirmed: false, reason: outcome.reason };
      }
    }
  }

  // Notify the payer (client) — and the property owner on success — so the
  // right user sees the outcome instead of everyone.
  if (foundPayment.bookingId) {
    const bookingForNotify = await Booking.findById(foundPayment.bookingId);
    const payingClientId = bookingForNotify?.clientId;
    if (foundPayment.status === PaymentStatus.SUCCESS) {
      if (payingClientId) {
        await createNotification({
          recipientRole: 'CLIENT',
          recipientId: payingClientId,
          kind: 'SYSTEM',
          title: 'Payment successful',
          message: 'Your payment was successful.',
          senderId: payingClientId,
          bookingId: foundPayment.bookingId,
        });
      }
      const roomForOwner = bookingForNotify
        ? await Room.findById(bookingForNotify.roomId)
        : null;
      const propOwner = roomForOwner?.propertyId
        ? (await Property.findById(roomForOwner.propertyId))?.owner
        : null;
      if (propOwner) {
        await createNotification({
          recipientRole: 'AGENT',
          recipientId: propOwner,
          kind: 'SYSTEM',
          title: 'Payment received',
          message: 'A client completed payment for a booking on your property.',
          senderId: payingClientId || undefined,
          bookingId: foundPayment.bookingId,
        });
      }
    } else if (foundPayment.status === PaymentStatus.FAILED && payingClientId) {
      await createNotification({
        recipientRole: 'CLIENT',
        recipientId: payingClientId,
        kind: 'SYSTEM',
        title: 'Payment failed',
        message:
          'Your payment could not be completed. You can retry while your hold is still active.',
        senderId: payingClientId,
        bookingId: foundPayment.bookingId,
      });

      // A failed payment keeps the hold so the user can retry before the window
      // closes - the room is deliberately NOT released here. Reverting the
      // booking to PENDING_PAYMENT puts it back on the normal timer rather than
      // the in-flight one, since there is no longer anything in flight.
      const bookingAfterFail = await Booking.findById(foundPayment.bookingId);
      if (
        bookingAfterFail &&
        [BookingStatus.PAYMENT_IN_FLIGHT, BookingStatus.PENDING_PAYMENT].includes(
          bookingAfterFail.status,
        )
      ) {
        bookingAfterFail.status = BookingStatus.FAILED;
        const hardCap = bookingAfterFail.hardExpiresAt
          ? new Date(bookingAfterFail.hardExpiresAt).getTime()
          : Date.now() + HOLD_HARD_CAP_MS;
        const retryWindow = new Date(
          Math.min(Date.now() + PAYMENT_IN_FLIGHT_GRACE_MS, hardCap),
        );
        bookingAfterFail.expiresAt = retryWindow;
        await bookingAfterFail.save();

        await Room.updateOne(
          { _id: bookingAfterFail.roomId, holdRef: bookingAfterFail._id },
          { $set: { holdExpiresAt: retryWindow } },
        );
      }
    }

    // Paid but the room was gone: the client has money against a booking that
    // cannot be honoured. This needs a human to refund, so say so loudly rather
    // than reporting a plain success.
    if (
      foundPayment.status === PaymentStatus.SUCCESS &&
      bookingOutcome &&
      !bookingOutcome.confirmed
    ) {
      await createNotification({
        recipientRole: 'CLIENT',
        recipientId: foundPayment.bookingId
          ? (await Booking.findById(foundPayment.bookingId))?.clientId
          : null,
        kind: 'SYSTEM',
        title: 'Payment received - action needed',
        message:
          'Your payment succeeded but the room is no longer available to you. Our team will contact you about a refund.',
        senderId: null,
        bookingId: foundPayment.bookingId,
      });

      const ownerId = await (async () => {
        const bookingForOwner = await Booking.findById(foundPayment.bookingId);
        const roomForOwner = bookingForOwner
          ? await Room.findById(bookingForOwner.roomId)
          : null;
        return roomForOwner?.propertyId
          ? (await Property.findById(roomForOwner.propertyId))?.owner
          : null;
      })();
      if (ownerId) {
        await createNotification({
          recipientRole: 'AGENT',
          recipientId: ownerId,
          kind: 'SYSTEM',
          title: 'Payment received - conflict',
          message:
            'A payment was received for a booking whose room was no longer held. Reconciliation is required.',
          senderId: null,
          bookingId: foundPayment.bookingId,
        });
      }
    }
  }

  return sendResponse(res, 200, true, 'Payment verification status', {
    verification: verifyResponse?.data,
    payment: withId(foundPayment),
    // Lets the app stop showing a countdown and explain what happened, rather
    // than rendering a successful payment on a booking that never confirmed.
    bookingOutcome,
  });
});

//  GET /payments/user/:userId
//  Returns the most recent payment for a user (by their bookings). When the
//  supplied value is actually a payment record id it is returned directly,
//  which supports the mobile app's "refresh payment" flow.
export const getPaymentsByUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return sendResponse(res, 400, false, 'User ID is required');
  }

  let payment = null;

  if (mongoose.Types.ObjectId.isValid(userId)) {
    payment = await Payment.findById(userId).populate('bookingId');
  }

  if (!payment && mongoose.Types.ObjectId.isValid(userId)) {
    const bookings = await Booking.find({ clientId: userId })
      .sort({ createdAt: -1 })
      .select('_id');
    const bookingIds = bookings.map((b) => b._id);
    if (bookingIds.length > 0) {
      payment = await Payment.findOne({ bookingId: { $in: bookingIds } })
        .sort({ createdAt: -1 })
        .populate('bookingId');
    }
  }

  if (!payment) {
    return sendResponse(res, 404, false, 'No payment found for this user');
  }

  return sendResponse(
    res,
    200,
    true,
    'Payment retrieved successfully',
    withId(payment),
  );
});

//  POST /payments/cancel
//  The app posts the full payment payload when the user abandons the payment
//  screen. This is an explicit "I'm done here", so it DOES release the hold and
//  return the room to the market immediately rather than waiting out the window.
//
//  Two guards keep that from doing damage:
//    - Only the holder releases the room. This was the bug that let a stale
//      cancel free a room another booking had since taken.
//    - A booking whose payment already verified as SUCCESS is left confirmed.
//      Cancelling a settled payment must not release a paid room; that is a
//      refund, which is a different operation.
export const cancelPayment = asyncHandler(async (req, res, next) => {
  const { id, bookingId, transactionRef } = req.body;

  let payment = null;

  if (id && mongoose.Types.ObjectId.isValid(id)) {
    payment = await Payment.findById(id);
  }
  if (!payment && bookingId) {
    payment = await Payment.findOne({ bookingId }).sort({ createdAt: -1 });
  }
  if (!payment && transactionRef) {
    payment = await Payment.findOne({ transactionRef });
  }

  if (!payment) {
    return sendResponse(res, 404, false, 'No payment found to cancel');
  }

  // A payment the provider already settled must not be flipped to FAILED.
  const alreadySettled =
    payment.status === PaymentStatus.SUCCESS && Boolean(payment.paidAt);

  if (!alreadySettled) {
    payment.status = PaymentStatus.FAILED;
    await payment.save();
  }

  let roomReleased = false;

  if (payment.bookingId) {
    const booking = await Booking.findById(payment.bookingId);
    if (booking) {
      if (booking.status === BookingStatus.CONFIRMED || alreadySettled) {
        return sendResponse(
          res,
          409,
          false,
          'This payment already completed, so the booking stays confirmed. Contact support to request a refund.',
          withId(payment),
          { roomReleased: false, roomRemainsBooked: true },
        );
      }

      booking.status = BookingStatus.CANCELLED;
      booking.expiresAt = null;
      await booking.save();

      // Ownership-checked release: only clears the room if this booking still
      // holds it.
      roomReleased = await releaseHold({
        roomId: booking.roomId,
        bookingId: booking._id,
      });

      // Notify the payer (client) their payment was cancelled/failed.
      if (booking.clientId) {
        await createNotification({
          recipientRole: 'CLIENT',
          recipientId: booking.clientId,
          kind: 'SYSTEM',
          title: 'Payment cancelled',
          message:
            'Your payment was cancelled and the room is available to other users again.',
          senderId: booking.clientId,
          bookingId: payment.bookingId,
        });
      }
    }
  }

  return sendResponse(
    res,
    200,
    true,
    'Payment cancelled successfully',
    withId(payment),
    { roomReleased },
  );
});

export const getSingleChargeDetails = asyncHandler(async (req, res, next) => {
  const { chargeId } = req.params;

  if (!chargeId) {
    return sendResponse(res, 400, false, 'chargeId is required in parameters');
  }

  paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);
  const detailsResponse = await paychangu.singleChargeDetails({ chargeId });

  return sendResponse(
    res,
    200,
    true,
    'Charge details retrieved successfully',
    detailsResponse?.data,
  );
});
