
import mongoose from "mongoose";

const rentableUnitSchema = new mongoose.Schema(
{
  monthlyRent: {
    type: Number,
    required: true,
    min: 0
  },

  bookingFee: {
    type: Number,
    required: true,
    min: 0
  }
},
{
  discriminatorKey: "unitType",
  timestamps: true
});

export default mongoose.model("RentableUnit", rentableUnitSchema);