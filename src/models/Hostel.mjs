import mongoose from "mongoose";

const hostelSchema = new mongoose.Schema(
{
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },

  title: String,
  description: String
},
{ timestamps: true }
);

export default mongoose.model("Hostel", hostelSchema);