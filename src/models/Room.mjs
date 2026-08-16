import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    type: { type: String, required: true },
    available: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Room = mongoose.model('Room', roomSchema);
