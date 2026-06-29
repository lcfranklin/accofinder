import mongoose from "mongoose";
import RentableUnit from "./RentableUnit.mjs";

const houseSchema = new mongoose.Schema(
{
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },

  title: String,
  description: String,

  costCategory: {
    type: String,
    enum: ["Low_Cost", "Medium_Cost", "High_Cost"]
  },

  numberOfRooms: Number,
  numberOfBathrooms: Number,
  squareFootage: Number,

  isAvailable: {
    type: Boolean,
    default: true
  }
},
{ timestamps: true }
);

export default RentableUnit.discriminator("House", houseSchema);