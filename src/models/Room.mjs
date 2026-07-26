import mongoose from 'mongoose';
import RentableUnit from './RentableUnit.mjs';

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
      enum: [1, 2, 3],
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
    },
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      default: null,
    },
    house: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'House',
      default: null,
    },
    floorNumber: {
      type: Number,
      min: 0,
    },
    squareFootage: {
      type: Number,
      min: 0,
    },
    hasWindow: {
      type: Boolean,
      default: true,
    },
    hasBalcony: {
      type: Boolean,
      default: false,
    },
    amenities: [
      {
        type: String,
        enum: [
          'AC',
          'FAN',
          'HEATER',
          'FURNISHED',
          'SEMI_FURNISHED',
          'UNFURNISHED',
          'ATTACHED_BATHROOM',
        ],
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes
roomSchema.index({ property: 1, isAvailable: 1 });
roomSchema.index({ hostel: 1, isAvailable: 1 });
roomSchema.index({ house: 1, isAvailable: 1 });
roomSchema.index({ capacity: 1 });

// Virtuals
roomSchema.virtual('beds', {
  ref: 'Bed',
  localField: '_id',
  foreignField: 'room',
});

// Methods
roomSchema.methods.getRentableUnitData = function () {
  return {
    id: this._id,
    monthlyRent: this.monthlyRent,
    bookingFee: this.bookingFee,
    isAvailable: this.isAvailable,
  };
};

roomSchema.methods.getAvailableBedsCount = function () {
  return mongoose.model('Bed').countDocuments({
    room: this._id,
    isAvailable: true,
  });
};

roomSchema.methods.updateAvailability = async function () {
  if (this.hostel) {
    const availableBeds = await this.getAvailableBedsCount();
    this.isAvailable = availableBeds > 0;
    await this.save();
  }
};

const Room =
  mongoose.models.Room || RentableUnit.discriminator('Room', roomSchema);
export default Room;
