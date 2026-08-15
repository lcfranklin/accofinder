import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import { Booking } from '../models/Booking.mjs';
import { Payment } from '../models/Payment.mjs';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';
import { PaymentStatus } from '../models/enums/PaymentStatus.mjs';
import { v4 as uuidv4 } from 'uuid';
import paychangu from '../utils/paychangu.mjs';

const CURRENCY = process.env.PAYCHANGU_CURRENCY || 'MWK';

export const processMobilePayment = asyncHandler(async (req, res) => {
  const { phoneNumber, bookingId, amount, operatorRefId } = req.body;
  const clientId = req.params.id;

  const finalBookingId = bookingId || req.params.bookingId;
  const tx_ref = uuidv4();

  const findBookingData = await Booking.findById(finalBookingId)
    .populate({
      path: 'clientId',
      select: 'firstName lastName email phone',
    })
    .populate('roomId');

  if (!findBookingData) {
    return sendResponse(res, 404, false, 'Booking not found');
  }

  const mobile_money_operator_ref_id =
    operatorRefId || '20be6c20-adeb-4b5b-a7ba-0769820df4fb';

  paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);

  const response = await paychangu.chargeMobileMoney({
    mobile_money_operator_ref_id,
    mobile: phoneNumber,
    amount: String(amount || 0),
    charge_id: tx_ref,
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
    amount: amount || findBookingData.amount,
    paymentMethod: 'mobile_money',
    status: PaymentStatus.PENDING,
    transactionId: tx_ref,
  });

  await newPayment.save();

  return sendResponse(res, 200, true, 'Mobile money payment was successful', {
    ...response.data,
    tx_ref,
    paymentId: newPayment._id,
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
  const { chargeId } = req.params;

  if (!chargeId) {
    return sendResponse(res, 400, false, 'chargeId is required in parameters');
  }

  paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);
  const verifyResponse = await paychangu.verifyDirectChargeStatus({ chargeId });

  const isSuccess =
    verifyResponse?.status === 'success' ||
    verifyResponse?.data?.status === 'success';
  const amount = verifyResponse?.data?.amount;

  const foundPayment = await Payment.findOne({ transactionId: chargeId });

  if (foundPayment) {
    if (isSuccess) {
      if (Number(foundPayment.amount) === Number(amount)) {
        foundPayment.status = PaymentStatus.COMPLETED;
      } else {
        foundPayment.status = PaymentStatus.FAILED;
      }
    } else {
      foundPayment.status = PaymentStatus.FAILED;
    }

    await foundPayment.save();

    if (isSuccess && foundPayment.status === PaymentStatus.COMPLETED) {
      if (foundPayment.bookingId) {
        await Booking.findByIdAndUpdate(
          foundPayment.bookingId,
          { status: BookingStatus.PAID },
          { returnDocument: 'after' },
        );
      }
    }
  }

  return sendResponse(res, 200, isSuccess, 'Payment verification status', {
    verification: verifyResponse?.data,
    payment: foundPayment,
  });
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
