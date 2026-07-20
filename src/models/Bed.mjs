import mongoose from 'mongoose';
import RentableUnit from './RentableUnit.mjs';

const bedSchema = new mongoose.Schema(
  {
    bedNumber: {
      type: String,
      required: true,
      trim: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    bedType: {
      type: String,
      enum: ['SINGLE', 'DOUBLE', 'BUNK_TOP', 'BUNK_BOTTOM'],
      default: 'SINGLE',
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
bedSchema.index({ room: 1, isAvailable: 1 });
bedSchema.index({ bedNumber: 1, room: 1 }, { unique: true });

// Methods
bedSchema.methods.getRentableUnitData = function () {
  return {
    id: this._id,
    monthlyRent: this.monthlyRent,
    bookingFee: this.bookingFee,
    isAvailable: this.isAvailable,
  };
};

bedSchema.methods.bookBed = async function () {
  const updated = await this.constructor.findOneAndUpdate(
    { _id: this._id, isAvailable: true },
    { isAvailable: false },
    { new: true },
  );
  if (!updated) {
    throw new Error('Bed is not available');
  }
  Object.assign(this, updated.toObject());

  const Room = mongoose.model('Room');
  const room = await Room.findById(this.room);
  if (room) {
    const availableBeds = await this.constructor.countDocuments({
      room: this.room,
      isAvailable: true,
    });
    if (availableBeds === 0) {
      room.isAvailable = false;
      await room.save();
    }
  }

  return this;
};

bedSchema.methods.releaseBed = async function () {
  this.isAvailable = true;
  await this.save();

  const Room = mongoose.model('Room');
  const room = await Room.findById(this.room);
  if (room && !room.isAvailable) {
    room.isAvailable = true;
    await room.save();
  }

  return this;
};

const Bed = mongoose.models.Bed || RentableUnit.discriminator('Bed', bedSchema);
export default Bed;
