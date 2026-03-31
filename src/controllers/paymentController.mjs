import Payment from "../models/Payment.mjs";
import { pcFetch } from "../utils/helpers.mjs";
import HouseBooking from "../models/HouseBooking.mjs";

const WEBHOOK_SECRET = process.env.PAYCHANGU_WEBHOOK_SECRET;
const CURRENCY = process.env.PAYCHANGU_CURRENCY || "MWK";
const BACKEND_URL = process.env.BACKEND_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;
const CALLBACK_URL = process.env.CALLBACK_URL

//logic to initialize the payment
export const initPayment = async (req, res, next) => {
  try {
    const { passportID, passportFee } = req.body;
    const clientId = req.user._id;
    
    if (!passportID || !passportFee) {
      return res.status(400).json({
        success: false,
        message: "passportID and fee is required",
      });
    }

    const findPassportData = await HouseBooking.findById(passportID)
      .populate({
        path: "client",
        populate: {
          path: "Nrb"
        }
      });

    if (!findPassportData) {
      return res.status(404).json({
        success: false,
        message: "Passport Data not found",
      });
    }

    if (String(clientId) !== String(findPassportData.client._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to make a payment for this Passport",
      });
    }

    const amount = passportFee;
    const tx_ref = `PS-${findPassportData._id}-${Date.now()}`;

    const payload = {
      amount: String(amount),
      currency: CURRENCY,
      email: findPassportData.client?.email,
      first_name: findPassportData.client?.firstname,
      last_name: findPassportData.client?.lastname,
      callback_url: CALLBACK_URL,
      return_url: FRONTEND_URL,
      tx_ref,
    };

    // Call PayChangu API
    const resp = await pcFetch("/payment", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const checkoutUrl = resp?.data?.checkout_url;
    if (!checkoutUrl) throw new Error("No checkout_url returned by PayChangu");

    // Saving
    const newPayment = new Payment({
      client: clientId,
      amount: amount,
      currency: CURRENCY,
      paymentMethod: 'card', 
      status: 'pending',
      paymentStatus: 'pending',
      paymentRef: tx_ref,
      transactionId: tx_ref, 
      createdAt: new Date()
    });

    await newPayment.save();

    return res.status(200).json({
      success: true,
      message: "Checkout session created",
      checkout_url: checkoutUrl,
      tx_ref,
      paymentId: newPayment._id 
    });
  } catch (err) {
    next(err);
  }
};

//logic to verify payment
//  Verify after redirect (callback_url) to be tested
/*the redirect is not currently not working on local host to be tested propary when the backend is hosted */
export const verify = async (req, res, next) => {
  try {
    const { tx_ref, status } = req.query;
    
    if (!tx_ref) {
      return res.status(400).json({
        success: false,
        message: "tx_ref missing"
      });
    }

    const verifyResponse = await pcFetch(`/verify-payment/${encodeURIComponent(tx_ref)}`, { 
      method: "GET" 
    });

    const isSuccess = verifyResponse?.status === "success" && verifyResponse?.data?.status === "success";
    const amount = verifyResponse?.data?.amount;
    const currency = verifyResponse?.data?.currency;

    const foundPayment = await Payment.findOne({ paymentRef: tx_ref });
    
    if (foundPayment) {
      if (isSuccess) {
        if (Number(foundPayment.amount) === Number(amount) && currency === CURRENCY) {
          foundPayment.status = "completed";
          foundPayment.paidAt = new Date();
        } else {
          foundPayment.status = "failed";
        }
      } else {
        foundPayment.status = "failed";
      }

      if (verifyResponse?.data?.transaction_id) {
        foundPayment.transactionId = verifyResponse.data.transaction_id;
      }

      await foundPayment.save();

      // UPDATE IMMIGRATION STATUS 
      if (isSuccess && foundPayment.status === "completed") {
        // Option 1: If you stored passport reference in payment
        if (foundPayment.passport) {
           await HouseBooking.findOneAndUpdate(
            { client: foundPayment.client },
            { paymentStatus: "completed" },
            { new: true }
          );
        } 
      
      }
     
    }
    // Choose either JSON response OR redirect 
    if (req.headers['content-type'] === 'application/json' || 
        req.headers['accept']?.includes('application/json')) {
      return res.status(200).json({ 
        success: isSuccess, 
        verification: verifyResponse,
        payment: foundPayment 
      });
    } else {
      // Redirect for browser requests
      const dest = isSuccess
        ? `${FRONTEND_URL}/payment/success?tx_ref=${encodeURIComponent(tx_ref)}`
        : `${FRONTEND_URL}/payment/failed?tx_ref=${encodeURIComponent(tx_ref)}&status=${encodeURIComponent(status || "failed")}`;
      
      return res.status(200).json({
          redirectURL: dest
      });
    }

  } catch (err) {
    next(err);
  }
};

//webhook logic
export const webhookHandler = async (req, res, next) => {
  try {
    // Verify signature (HMAC-SHA256 of raw body using WEBHOOK_SECRET), header name: 'Signature'
    /**this is was ensipired from pychangu documentation */
    const signatureHeader = req.header("Signature") || "";
    const raw = req.body; 
    if (!WEBHOOK_SECRET) {
      console.warn("No PAYCHANGU_WEBHOOK_SECRET configured");
      return res.status(400).send("Webhook secret not configured");
    }

    // Compute HMAC
    const crypto = await import("crypto");
    const computed = crypto.createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
    if (computed !== signatureHeader) {
      console.warn("Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }

    // Parse JSON after signature check
    const event = JSON.parse(raw.toString("utf8"));

    // Example shapes (see docs), we care about tx_ref & status
    const txRef = event?.data?.tx_ref || event?.tx_ref;
    const status = event?.data?.status || event?.status;

    if (!txRef) return res.status(200).send("ok"); // nothing to do

    return res.status(200).send("ok");
  } catch (err) {
    next(err)
  }
};

// Logic to get payment by User
export const getPaymentsByUser = async (req, res, next) => {
  try {
    const clientId = req.user._id; 
    const { status } = req.query;

    // Build filter object
    const filter = { client: clientId };
    if (status) {
      filter.status = status;
    }

    // Get all payments with population
    const payments = await Payment.find(filter)
      .populate('passport', 'passportType serviceType bookletType paymentStatus') 
      .sort({ createdAt: -1 }) 
      .lean();

    return res.status(200).json({
      success: true,
      data: payments,
      count: payments.length
    });

  } catch (error) {
      next(error)
  }
};

// Logic to cancel payment
export const cancelPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const clientId = req.user._id;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required"
      });
    }

    // Find the payment
    const payment = await Payment.findOne({
      _id: paymentId,
      client: clientId
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found or you are not authorized to cancel this payment"
      });
    }

    // Checking if payment can be cancelled
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel payment with status: ${payment.status}. Only pending payments can be cancelled.`
      });
    }

    // Update payment status to failed
    payment.status = 'failed';
    await payment.save();

    //update the associated immigration record if it exists
    if (payment.client) {
      await HouseBooking.findByIdAndUpdate(
        payment.client,
        { paymentStatus: 'failed' },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Payment cancelled successfully",
      data: {
        paymentId: payment._id,
        status: payment.status,
        paymentRef: payment.paymentRef
      }
    });

  } catch (error) {
    next(err)
  }
};