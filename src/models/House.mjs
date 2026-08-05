import mongoose from 'mongoose';
import Property from './Property.mjs';

const houseSchema = new mongoose.Schema({
  costCategory: {
    type: String,
    enum: ['LOW_COST', 'MEDIUM_COST', 'HIGH_COST'],
    required: true,
  },
  numberOfRooms: {
    type: Number,
    required: true,
    min: 1
  },
  numberOfBathrooms: {
    type: Number,
    required: true,
    min: 1
  },
  floorNumber: {
    type: Number,
    min: 0
  },
  hasLivingRoom: {
    type: Boolean,
    default: true
  },
  hasKitchen: {
    type: Boolean,
    default: true
  },
  squareFootage: {
    type: Number,
    min: 0
  },
  monthlyRent: {
    type: Number,
    required: true,
    min: 0
  },
  bookingFee: {
    type: Number,
    required: true,
    min: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
houseSchema.index({ isAvailable: 1 });
houseSchema.index({ monthlyRent: 1 });

// Virtuals
houseSchema.virtual('rooms', {
  ref: 'Room',
  localField: '_id',
  foreignField: 'house'
});

// Methods
houseSchema.methods.getRentableUnitData = function() {
  return {
    id: this._id,
    monthlyRent: this.monthlyRent,
    bookingFee: this.bookingFee,
    isAvailable: this.isAvailable
  };
};


const House = mongoose.models.House || Property.discriminator('House', houseSchema);
export default House;
