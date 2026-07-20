import mongoose from 'mongoose';

const rentableUnitSchema = new mongoose.Schema(
  {
    monthlyRent: {
      type: Number,
      required: true,
      min: 0,
    },
    bookingFee: {
      type: Number,
      required: true,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    discriminatorKey: 'unitType',
    timestamps: true,
  },
);
rentableUnitSchema.methods.getRentableUnitData = function () {
  return {
    id: this._id,
    monthlyRent: this.monthlyRent,
    bookingFee: this.bookingFee,
    isAvailable: this.isAvailable,
  };
};

export default mongoose.models.RentableUnit ||
  mongoose.model('RentableUnit', rentableUnitSchema);
