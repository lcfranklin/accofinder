import mongoose from "mongoose";
import RentableUnit from "./RentableUnit.mjs";

const bookingSchema = new mongoose.Schema(
{
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  rentableUnit: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'rentableUnitType'
  },
  rentableUnitType: {
    type: String,
    required: true,
    enum: ['HOUSE', 'ROOM', 'BED']
  },

  unitType: {
    type: String,
    enum: ["House", "Room", "Bed"],
    required: true
  },

  startDate: {
    type: Date,
    required: true
  },

  endDate: {
    type: Date,
    required: true
  },

  bookingFee: {
    type: Number,
    required: true,
    min: 0
  },

  totalRentAmount: {
    type: Number,
    required: true,
    min: 0
  },

  status: {
    type: String,
    enum: ["PENDING", "PAID", "CONFIRMED", "CANCELLED"],
    default: "PENDING"
  },

  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
    default: null
  },

  cancellationReason: {
    type: String,
    trim: true,
    default: null
  },

  cancellationDate: {
    type: Date,
    default: null
  }

},
{
  timestamps: true
});


bookingSchema.index({ tenant: 1 });
bookingSchema.index({ rentableUnit: 1, unitType: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ startDate: 1, endDate: 1 });



bookingSchema.pre("validate", function (next) {
  if (this.startDate >= this.endDate) {
    return next(new Error("End date must be after start date"));
  }

  const now = new Date();
  if (this.startDate < now) {
    return next(new Error("Start date must be in the future"));
  }

  next();
});



bookingSchema.statics.isUnitAvailable = async function (
  rentableUnit,
  unitType,
  startDate,
  endDate
) {
  const overlap = await this.findOne({
    rentableUnit,
    unitType,
    status: { $ne: "CANCELLED" },
    $or: [
      {
        startDate: { $lt: endDate },
        endDate: { $gt: startDate }
      }
    ]
  });

  return !overlap;
};



bookingSchema.methods.confirm = async function () {
  if (this.status !== "PAID") {
    throw new Error("Only PAID bookings can be confirmed");
  }

  this.status = "CONFIRMED";
  await this.save();
  return this;
};

bookingSchema.methods.markPaid = async function (paymentId) {
  if (this.status !== "PENDING") {
    throw new Error("Only PENDING bookings can be marked as PAID");
  }

  this.status = "PAID";
  this.payment = paymentId;

  await this.save();
  return this;
};

bookingSchema.methods.cancel = async function (reason) {
  if (this.status === "CANCELLED") {
    throw new Error("Booking already cancelled");
  }

  this.status = "CANCELLED";
  this.cancellationReason = reason;
  this.cancellationDate = new Date();

  // release unit availability
  const UnitModel = mongoose.model(this.unitType);

  const unit = await UnitModel.findById(this.rentableUnit);
  if (unit) {
    unit.isAvailable = true;
    await unit.save();
  }

  await this.save();
  return this;
};


const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;