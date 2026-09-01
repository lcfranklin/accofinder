import { asyncHandler, sendResponse, withId } from '../utils/helpers.mjs';
import { Booking } from '../models/Booking.mjs';
import { Room } from '../models/Room.mjs';
import { Payment } from '../models/Payment.mjs';
import { Property } from '../models/Property.mjs';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';
import { v4 as uuidv4 } from 'uuid';
import paychangu from '../utils/paychangu.mjs';
import { PaymentStatus } from '../models/enums/PaymentStatus.mjs';
import { createNotification } from '../services/notificationService.mjs';
import mongoose from 'mongoose';

const CURRENCY = process.env.PAYCHANGU_CURRENCY || 'MWK';

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

  return sendResponse(res, 200, true, 'Mobile money payment was successful', {
    ...response.data,
    tx_ref,
    payment: withId(newPayment),
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

  if (foundPayment.status === PaymentStatus.SUCCESS) {
    if (foundPayment.bookingId) {
      await Booking.findByIdAndUpdate(
        foundPayment.bookingId,
        { status: BookingStatus.PAID },
        { returnDocument: 'after' },
      );
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
        message: 'Your payment could not be completed. Please try again.',
        senderId: payingClientId,
        bookingId: foundPayment.bookingId,
      });
    }
  }

  return sendResponse(res, 200, true, 'Payment verification status', {
    verification: verifyResponse?.data,
    payment: withId(foundPayment),
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
//  The app posts the full payment payload. Cancelling marks the payment as
//  failed and returns the booking to PENDING (releasing the room again).
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
    return sendResponse(res, 404, false, 'Payment not found to cancel');
  }

  payment.status = PaymentStatus.FAILED;
  await payment.save();

  if (payment.bookingId) {
    const booking = await Booking.findById(payment.bookingId);
    if (booking) {
      booking.status = BookingStatus.PENDING;
      await booking.save();

      const room = await Room.findById(booking.roomId);
      if (room) {
        room.available = true;
        await room.save();
      }

      // Notify the payer (client) their payment was cancelled/failed.
      if (booking.clientId) {
        await createNotification({
          recipientRole: 'CLIENT',
          recipientId: booking.clientId,
          kind: 'SYSTEM',
          title: 'Payment failed',
          message: 'Your payment was cancelled and could not be completed.',
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
