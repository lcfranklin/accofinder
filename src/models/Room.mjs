import mongoose from 'mongoose';
import { RoomType } from './enums/RoomType.mjs';

const roomSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property ID is required'],
    },
    type: {
      type: String,
      enum: {
        values: Object.values(RoomType),
        message: '{VALUE} is not a valid room type',
      },
      uppercase: true,
      default: RoomType.SINGLE,
      required: [true, 'Room type is required'],
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Room = mongoose.model('Room', roomSchema);
