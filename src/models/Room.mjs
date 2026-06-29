import mongoose from "mongoose";
import RentableUnit from "./RentableUnit.mjs";

const roomSchema = new mongoose.Schema(
{
  roomName: String,
  capacity: {
    type: Number,
    enum: [1, 2, 3]
  },

  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    default: null
  },

  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hostel",
    default: null
  },

  isAvailable: {
    type: Boolean,
    default: true
  }
},
{ timestamps: true }
);

// enforce single parent rule
roomSchema.pre("validate", function (next) {
  if (!this.property && !this.hostel) {
    return next(new Error("Room must belong to Property or Hostel"));
  }

  if (this.property && this.hostel) {
    return next(new Error("Room cannot belong to both Property and Hostel"));
  }

  next();
});

export default RentableUnit.discriminator("Room", roomSchema);