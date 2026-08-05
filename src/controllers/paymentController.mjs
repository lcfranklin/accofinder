import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import Booking from '../models/Booking.mjs';
import Payment from "../models/Payment.mjs";
import { v4 as uuidv4 } from 'uuid';
import paychangu from '../utils/paychangu.mjs';
import { PaymentStatus } from '../models/enums/PaymentStatus.mjs';

const CUURRENCY = process.env.PAYCHANGU_CURRENCY || 'MK';

export const processMobilePayment = asyncHandler(async (req, res) => {
  const { phoneNumber, bookingId, amount, operatorRefId } = req.body;
  const clientId = req.params.id;
  
  const finalBookingId = bookingId || req.params.bookingId;
  const tx_ref = uuidv4();

  const findBookingData = await Booking.findById(finalBookingId)
    .populate({
      path: "user",
      strictPopulate:false,
      populate:{
        path: "rentableUnit",
      }
    });

  if(!findBookingData){
    return sendResponse(res, 404, false, "Booking not found");
  } 
  if(String(clientId)!== String(findBookingData.client._id)){  
    return sendResponse(res, 401, false, "Unauthorized to make payment for this booking");
  }
  
  const email = req.user.email || findBookingData.client?.email;
  const first_name = req.user.name?.firstName || req.user.firstName || findBookingData.client?.name?.firstName;
  const last_name = req.user.name?.surname || req.user.lastName || findBookingData.client?.name?.surname;

  const mobile_money_operator_ref_id = operatorRefId || '20be6c20-adeb-4b5b-a7ba-0769820df4fb';

  paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);

  const response = await paychangu.chargeMobileMoney({
    mobile_money_operator_ref_id,
    mobile: phoneNumber,
    amount: String(amount || 0),
    email,
    first_name,
    last_name,
    charge_id: tx_ref
  });

  const isSuccess = response?.status === 'success' || response?.data?.status === 'success';
  if(!response || !isSuccess) {
    throw new Error(response?.message || "Mobile MoneyPayment was unsuccessful");
  }

  const newPayment = new Payment({
    client: clientId,
    amount: amount,
    currency: CUURRENCY,
    paymentMethod: 'mobile_money',
    status: 'INITIATED',
    paymentRef: tx_ref,
    transactionId: tx_ref,
    createdAt: new Date(),
  });

  await newPayment.save();

  return sendResponse(res, 200, true, "Mobile money payment was successful", {
    ...response.data,
    tx_ref,
    paymentId: newPayment._id
  });
});

export const getSupportedMomoOperators = asyncHandler(async (req, res, next) => {
  paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);
  const response = await paychangu.supportedMomoOperators();

  return sendResponse(res, 200, true, "Supported mobile money operators retrieved", response?.data);
});

export const verifyMobilePayment = asyncHandler(async (req, res, next) => {
  const { chargeId } = req.params;

  if (!chargeId) {
    return sendResponse(res, 400, false, "chargeId is required in parameters");
  }

  paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);
  const verifyResponse = await paychangu.verifyDirectChargeStatus({ chargeId });

  const isSuccess = verifyResponse?.status === "success" || verifyResponse?.data?.status === "success";
  const amount = verifyResponse?.data?.amount;
  const currency = verifyResponse?.data?.currency;

  const foundPayment = await Payment.findOne({ paymentRef: chargeId });

  if (foundPayment) {
    if (isSuccess) {
      if (Number(foundPayment.amount) === Number(amount) && currency === CUURRENCY) {
        foundPayment.status = PaymentStatus.SUCCESS;
        foundPayment.paidAt = new Date();
      } else {
        foundPayment.status = PaymentStatus.FAILED;
      }
    } else {
      foundPayment.status = PaymentStatus.FAILED;
    }

    await foundPayment.save();

    if (isSuccess && foundPayment.status === PaymentStatus.SUCCESS) {
      if (foundPayment.booking || foundPayment.client) {
        await Booking.findOneAndUpdate(
          { client: foundPayment.client },
          { status: PaymentStatus.SUCCESS },
          { new: true }
        );
      }
    }
  }

  return sendResponse(res, 200, isSuccess, "Payment verification status", {
    verification: verifyResponse?.data,
    payment: foundPayment
  });
});

export const getSingleChargeDetails = asyncHandler(async (req, res, next) => {
  const { chargeId } = req.params;

  if (!chargeId) {
    return sendResponse(res, 400, false, "chargeId is required in parameters");
  }

  paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);
  const detailsResponse = await paychangu.singleChargeDetails({ chargeId });

  return sendResponse(res, 200, true, "Charge details retrieved successfully", detailsResponse?.data);
});
