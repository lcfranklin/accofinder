import paychangu from '@api/paychangu';
import HouseBooking from '../models/HouseBooking.mjs';
import Payment from "../models/Payment.mjs";

const WEBHOOK_SECRET = process.env.PAYCHANGU_WEBHOOK_SECRET || process.env.PAYCHANGU_SECRET_KEY;
const CUURRENCY = process.env.PAYCHANGU_CURRENCY || 'MKW';
const BACKEND_URL = process.env.BACKEND_URL 
const FRONTEND_URL = process.env.FRONTEND_URL
const CALLBACK_URL = process.env.CALLBACK_URL


export const initPayment = async (req, res, next) => {
  try {
    const { bookingId, bookingFee, mobile, mobile_money_operator_ref_id } = req.body;
    const clientId = req.user._id;

    if (!bookingId || !bookingFee || !mobile || !mobile_money_operator_ref_id) {
      return res.status(400).json({
        status: "failed",
        message: "bookingId, bookingFee, mobile, and mobile_money_operator_ref_id are required"
      });
    }

    const findBookingData = await HouseBooking.findById(bookingId).populate('tenant');

    if (!findBookingData) {
      return res.status(404).json({
        status: "failed",
        message: "Booking not found"
      });
    }

    if (String(clientId) !== String(findBookingData.tenant._id)) {
      return res.status(403).json({
        status: "failed",
        message: "Unauthorized to make payment for this booking"
      });
    }

    const amount = bookingFee;
    const tx_ref = `PS_${findBookingData._id}_${Date.now()}`;

    const firstName = findBookingData.tenant?.name?.firstName || "Client";
    const surname = findBookingData.tenant?.name?.surname || "User";
    const email = findBookingData.tenant?.email || "email@example.com";

    const payload = {
      amount: String(amount),
      mobile: mobile,
      mobile_money_operator_ref_id: mobile_money_operator_ref_id,
      charge_id: tx_ref,
      email: email,
      first_name: firstName,
      last_name: surname
    };

    // Calling PayChangu Direct Charge API via SDK
    paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);
    const { data: response } = await paychangu.chargeMobileMoney(payload);

    if (response?.status !== "success") {
      return res.status(400).json({
        status: "failed",
        message: response?.message || "Failed to initialize mobile money payment"
      });
    }


    // Determine the payment method
    let paymentMethod = 'Airtel';
    if (mobile_money_operator_ref_id === '27494cb5-ba9e-437f-a114-4e7a7686bcca') {
      paymentMethod = 'TNM';
    } else if (mobile_money_operator_ref_id === '20be6c20-adeb-4b5b-a7ba-0769820df4fb') {
      paymentMethod = 'Airtel';
    }

    // Saving payment
    const newPayment = new Payment({
      client: clientId,
      booking: findBookingData._id,
      amount: amount,
      currency: CUURRENCY,
      paymentMethod: paymentMethod,
      status: 'pending',
      transactionId: tx_ref,
      createdAt: new Date(),
    });

    await newPayment.save();

    return res.status(200).json({
      success: true,
      message: "Mobile money payment initiated successfully",
      data: response.data,
      tx_ref,
      paymentId: newPayment._id
    });

  } catch (error) {
    next(error);
  }
};

// Verify mobile money payment status
export const verify  =  async (req, res, next)=>{
  try{
    const {tx_ref, status} = req.query;
    if(!tx_ref){
      return res.status(400).json({
        success: false,
        message: "tx_ref missing"
      });
    }

    // Verify via PayChangu SDK
    paychangu.auth(`Bearer ${process.env.PAYCHANGU_SECRET_KEY}`);
    const { data: verifyResponse } = await paychangu.verifyMobileMoneyPayment({ chargeId: tx_ref });

    const isSuccess = verifyResponse?.status === "success" && verifyResponse?.data?.status === "success";
    const amount = verifyResponse?.data?.amount;
    const currency = verifyResponse?.data?.currency;

    const foundPayment = await Payment.findOne({ transactionId: tx_ref });

    if (foundPayment){
      if(isSuccess){
        //verifying the amount paid via PayChangu
        if(Number(foundPayment.amount) === Number(amount) && currency===CUURRENCY){
          foundPayment.status = "completed";
          foundPayment.paidAt = new Date();
        } else{
          foundPayment.status = "failed"
        }
      } else {
        foundPayment.status = "failed";
      }
      if(verifyResponse?.data?.transaction_id){
        foundPayment.transactionId = verifyResponse.data.transaction_id;
      }

      await foundPayment.save();

      if(isSuccess && foundPayment.status === "completed"){
        if(foundPayment.booking){
          await HouseBooking.findByIdAndUpdate(
            foundPayment.booking,
            {
              isPaid: true,
              paidAt: new Date(),
              payment: foundPayment._id,
              status: 'confirmed'
            },
            { new: true }
          );
        }
      }
    }
    // choose either Json or redirect
    if(req.headers['content-type'] === 'application/json'||
       req.headers['accept']?.includes('application/json')){
      return res.status(200).json({
        success: isSuccess,
        verification: verifyResponse,
        payment: foundPayment
      });
    } else{
      //redirect for browser requests
      const dest = isSuccess
        ? `${FRONTEND_URL}/payment/success?tx_ref=${encodeURIComponent(tx_ref)}`
        : `${FRONTEND_URL}/payment/failed?tx_ref=${encodeURIComponent(tx_ref)}&status=${encodeURIComponent(status || "failed")}`
      
      return res.status(200).json({
        redirectURL: dest
      })  
    }

  }catch(error){
   next(error);
  }
};

//webhook logic
export const webhookHandler = async(req, res, next) => {
  try{
    // Verify signature (HMAC-SHA256 of raw body using WEBHOOK_SECRET), header name: 'Signature'
    const signatureHeader = req.header("Signature") || "";
    const raw = req.body;
    
    if(!WEBHOOK_SECRET){
      console.log("No PAYCHANGU_WEBHOOK_SECRET configured");
      return res.status(400).send("No webhook secret configured");
    }

    if (!raw) {
      return res.status(400).send("Empty body");
    }

    const crypto = await import("crypto");
    const computed = crypto.createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
    if(computed !== signatureHeader) {
      console.warn("Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }

    //Parse JSON after signature check
    const event = JSON.parse(Buffer.isBuffer(raw) ? raw.toString("utf8") : raw);

    // We care about tx_ref & status (direct charge uses charge_id / tx_ref)
    const txRef = event?.data?.tx_ref || event?.tx_ref || event?.data?.charge_id || event?.charge_id;
    const status = event?.data?.status || event?.status;
    const amount = event?.data?.amount || event?.amount;
    const currency = event?.data?.currency || event?.currency;

    if (!txRef) {
      return res.status(200).send("ok"); // nothing to do
    }

    const foundPayment = await Payment.findOne({ transactionId: txRef });
    if (foundPayment) {
      const isSuccess = status === "success" || status === "completed";
      if (isSuccess) {
        if (Number(foundPayment.amount) === Number(amount) && currency === CUURRENCY) {
          foundPayment.status = "completed";
          foundPayment.paidAt = new Date();
        } else {
          foundPayment.status = "failed";
        }
      } else {
        foundPayment.status = "failed";
      }

      if (event?.data?.transaction_id || event?.transaction_id) {
        foundPayment.transactionId = event.data.transaction_id || event.transaction_id;
      }

      await foundPayment.save();

      if (isSuccess && foundPayment.status === "completed" && foundPayment.booking) {
        await HouseBooking.findByIdAndUpdate(
          foundPayment.booking,
          {
            isPaid: true,
            paidAt: new Date(),
            payment: foundPayment._id,
            status: 'confirmed'
          },
          { new: true }
        );
      }
    }

    return res.status(200).send("ok");

  } catch(error){
    next(error)
  }
}
//logic to get payment by User
export const getPaymentsByUser = async(req, res, next) => {
  try{
    const clientId = req.user._id;
    const { status } = req.query;
    
    //build filter object
    const filter = {client: clientId};
    if(status){
      filter.status = status;
    }

    //Get all payments with population
    const payments = await Payment.find(filter)
      .populate({
        path: 'client',
        select: 'name email'
      })
      .sort({ createdAt: -1 }) // getting newest first
      .lean();

    return res.status(200).json({
      success: true,
      data: payments
    });

  }catch(error){
    next(error)
  }
}

//logic to cancel payment
export const cancelPayment = async(req, res, next) => {
  try{

    const { paymentId } = req.params;
    const clientId = req.user._id;

    if(!paymentId){
      return res.status(400).json({
        success: false,
        message: "Payment ID is required"
      });
    }

    // find the payment
    const payment = await Payment.findOne({
      _id: paymentId,
      client: clientId
    });

    if (!payment){
      return res.status(400).json({
        success: false,
        message: "Payment not found or you are not authorised to cancel this payment"
      });
    }

  } catch(error){
    next(error)
  }
}