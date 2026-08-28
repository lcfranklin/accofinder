import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property ID is required'],
    },
    type: {
      type: String,
      required: [true, 'Room type is required'],
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Room = mongoose.model('Room', roomSchema);
