import mongoose from 'mongoose';
import RentableUnit from './RentableUnit.mjs';

const houseSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  costCategory: {
    type: String,
    enum: ['LOW_COST', 'MEDIUM_COST', 'HIGH_COST'],
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
houseSchema.index({ property: 1 });
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


const House = mongoose.models.House || RentableUnit.discriminator('House', houseSchema);
export default House;
