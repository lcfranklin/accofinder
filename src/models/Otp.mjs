import mongoose from "mongoose";
const { Schema, model } = mongoose;

const otpSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ["registration", "login", "password_reset"],
    required: true,
  },
  status: {
    type: String,
    enum: ["PENDING", "USED", "EXPIRED"],
    default: "PENDING",
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

export default model("Otp", otpSchema);
