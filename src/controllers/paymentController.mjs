//import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import HouseBooking from '../models/HouseBooking.mjs';
import { pcFetch } from '../utils/helpers.mjs';
import Payment from "../models/Payment.mjs";

const WEbOOK_SECRET = process.env.PAYCHANGU_SECRET_KEY;
const CUURRENCY = process.env.PAYCHANGU_CURRENCY || 'MKW';
const BACKEND_URL = process.env.BACKEND_URL 
const FRONTEND_URL = process.env.FRONTEND_URL
const CALLBACK_URL = process.env.CALLBACK_URL


export const initiatePayment = async (req, res) => {
  try{
    const {bookingId, bookingFee} = req.body;
    const clientId = req.user._id;

    const amount = bookingFee;
    tx_ref = `PS_${findBookingData._id}_${Date.now()}`;

    if(!bookingId || !bookingFee){
      return res.status(400).json({
        status: "failed",
        message: "Booking ID and bookingFee required"
      });
    }

    const findBookingData = await HouseBoooking.findById(bookingId)
      .populate({
        path: "client",
        populate:{
          path: "House",
        }
      });

    if(!findBookingData){
      return res.status(404).json({
        status: "failed",
        message: "Booking not found"
      });
    } 
    if(String(clientId)!== String(findBookingData.client._id)){ 
      return res.status(403).json({
        status: "failed",
        message: "Unauthorized to make payment for this booking"
      });
    }

    const payload = {
      amount: String(amount),
      currency: CUURRENCY,
      tx_ref,
      email: findBookingData.client?.email,
      first_name: findBookingData.client?.firstName,
      last_name: findBookingData.client?.lastName,
      callback_url: CALLBACK_URL,
      return_url: FRONTEND_URL,
      tx_ref,
    };

    //calling PayChangu API
    const response = await pcFetch("/payment",{
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const checkoutUrl = response?.data?.checkout_url;
    if(!checkoutUrl) throw new Error("No checkout_url return by PayChangu") 

    //saving
    const newPayment = new Payment({
      client: clientId,
      amount: amount,
      currency: CUURRENCY,
      paymentMethod: 'card',
      status: 'pending',
      paymentStatus: 'pending',
      paymentRef: tx_ref,
      transactionId: tx_ref,
      createdAt: new Date(),
    });

    await newPayment.save();

    return res.status(200).json({
      success: true,
      message: "Checkout session created",
      checkout_url: checkoutUrl,
      tx_ref,
      paymentId: newPayment._id
    });

  }catch (error){
   next(error)
 }
};
//to verify payment
export const verify  =  async (req, res, next)=>{
  try{
    const {tx_ref, status} = req.query;
    if(!tx_ref){
      return res.status(404).json({
        success: false,
        message: "tx_ref missing"
      });
    }

    const verifyResponse = await pcFetch(`/verify/payment/${encodeURIComponet(tx_ref)}`,{
      method: "GET"
    });

    const isSuccess = verifyResponse?.status === "success" && verifyResponse?.data?.status === "success";
    const amount = verifyResponse?.data?.amount;
    const currency = verifyResponse?.data?.currency;

    const foundPayment = await Payment.findOne({paymentRef: tx_ref});

    if (foundPayment){
      if(isSuccess){
        //verifying the amount payed via PayChangu
        if(Number(foundPayment.amount) === Number(amount) && currency===CUURRENCY){
          foundPayment.status = "completed";
          foundPayment.paidAt = new Date();
        } else{
          foundPayment.status = "failed"
        }
      }
      if(verifyResponse?.data?.transaction_id){
        foundPayment.transactionId = verifyResponse.data.transaction_id;
      }

      await foundPayment.save();

      if(isSuccess && foundPayment.status === "completed"){
        //option 1. if booking references are stored in payment
        if(foundPayment.booking){
          await HouseBooking.findOneAndUpdate(
            {client: foundPayment.client},
            {paymentStatus: "completed"},
            {new: true},
          );
        }
      }
    }
    // choose either Json or  redirect
    if(req.headers['content-type'] === 'application/json'||
       req.headers['accept']?.includes('application/json')){
      return res.status(200).json({
        sucess: isSuccess,
        verification: verifyResponse,
        payment: foundPayment
      });
    } else{
      //redirect for browser requests
      const dest = isSuccess
        ? `${FRONTEND_URL}/payment/success?tx_ref=${encodeURIComponent(tx_ref)}`
        : `${FRONT_URL}/payment/failed?tx_ref=${encodeURIComponent(tx_ref)} &status=${encodeURIComponet(status || "failed")}`
      
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
    /**this is was ensipired from pychangu documentation */
    const signatureHeader = req.header("Signature") || "";
    const raw = req.body;
    if(WEBHOOK_SECRET){
      console.log("No PAYCHANGU_WEBHOOK_SECRET configured");
      return res.json(400).send("No webhook secret configured");
    }

    const crypto = await import("crypto");
    const computed = crypto.createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
    if(computed !== signatureHeader) {
      console.warn("Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }

    //Parse JSON after signature check
    const event = JSON.parse(raw.toString("utf8"));


    // Example shapes (see docs), we care about tx_ref & status
    const txRef = event?.data?.tx_ref || event?.tx_ref;
    const status = event?.data?.status || event?.status;

    if (!txRef) return res.status(200).send("ok"); // nothing to do

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
        select: 'firstNam lastName email'
      })
      .sort({createAt: -1}) // getting newest first
      .lean({});

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