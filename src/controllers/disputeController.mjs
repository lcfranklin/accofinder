import Dispute from '../models/Dispute.mjs';
import HouseBooking from '../models/HouseBooking.mjs';
import Payment from '../models/Payment.mjs'; 
import { isAuthenticated} from '../middleware/authMiddleware.mjs';

export const getDisputes = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let query = {};

    //if user  admin , they  see all disputes they are part of
    if(userRole == 'admin'){
      query = {};
    }

    if(userRole !== 'admin'){
      query = { $or: [{reporter: userId}, {reported: userId}]};
    }
    const disputes = await Dispute.find({});
      // .populate('reporter', 'firstName lastName email')
      // .populate('relatedHouse', 'title');

      return res.status(200).json(disputes);

  }catch (error) {
    next(error);  
  }
};

export const createDispute = async (req, res) => {
  try {
    const {raisedBy, title, status, description} = req.body;

    if(!raisedBy || !title || !status || !description){     
      return res.status(400).json({
        status: "failed",
        message: "All fields are required"
      });
    }

    // const reporterId = req.user._id;

    // const booking = await HouseBooking.findById(bookingId)
    // if(!booking){
    //   return res.status(404).json({
    //     status: "failed",
    //     message: "Booking not found"
    //   });
    // }
    // if(String(booking.tenant) !== String(reporterId)){
    //   return res.status(403).json({
    //     status: "failed",
    //     message: "You can only report disputes for your own bookings"
    //   });
    // }
    // //checking if the succesful payment exist for the booking
    // const checkPayment = await Payment.findOne({
    //   booking: bookingId,
    //   status: "completed"
    // })
    // if(!checkPayment){
    //   return res.status(400).json({
    //     status: "failed",
    //     message: "Cannot report dispute for unpaid booking"
    //   });
    // }

    const newDispute = new Dispute({
      raisedBy: raisedBy,
      title,
      status,
      description,
      status: status || "open"
    });

    const saveDispute = await newDispute.save();

    return res.status(201).json(saveDispute);

  } catch (error) {
    next(error);
  }
};

export const resolveDispute = async (req, res) => {
  try{
    // assuming Landlord approves refund
    const dispute = await Dispute.findById(id).populate(booking);

    if(action === 'APPROVE_REFUND'){
      const payment = await Payment.findOne({paymentRef: dispute.booking.paymentRef});


      if(payment){
        //updating the payment to refund
        payment.status = "refunded";
        payment.refundedAt = new Date();
        await  payment.save();
      }
    }

    //updating the Dispute status
    dispute.status = "closed";
    await HouseBooking.findByIdAndUpdate(dispute.booking._id, {status: "cancelled"});

  }catch (error) {
    next(error);
  }
}
   