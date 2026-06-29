import mongoose from "mongoose";
import RentableUnit from "./RentableUnit.mjs";

const bedSchema = new mongoose.Schema(
{
  bedNumber: String,

  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true
  },

  isAvailable: {
    type: Boolean,
    default: true
  }
},
{ timestamps: true }
);

export default RentableUnit.discriminator("Bed", bedSchema);