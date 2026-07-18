import mongoose from 'mongoose';
import RentableUnit from './RentableUnit.mjs';

const houseSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },

    title: String,
    description: String,

    costCategory: {
      type: String,
      enum: ['Low_Cost', 'Medium_Cost', 'High_Cost'],
    },

    numberOfRooms: Number,
    numberOfBathrooms: Number,
    squareFootage: Number,

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Indexes
houseSchema.index({ property: 1 });
houseSchema.index({ isAvailable: 1 });
houseSchema.index({ monthlyRent: 1 });

// Virtuals
houseSchema.virtual('rooms', {
  ref: 'Room',
  localField: '_id',
  foreignField: 'house',
});

// Methods
houseSchema.methods.getRentableUnitData = function () {
  return {
    id: this._id,
    monthlyRent: this.monthlyRent,
    bookingFee: this.bookingFee,
    isAvailable: this.isAvailable,
  };
};

const House =
  mongoose.models.House || RentableUnit.discriminator('House', houseSchema);
export default House;
