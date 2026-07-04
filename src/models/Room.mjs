import mongoose from 'mongoose';
import RentableUnit from './RentableUnit.mjs';

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    enum: [1, 2, 3],
    description: '1=Single, 2=Double, 3=Triple'
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    sparse: true
  },
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    sparse: true
  },
  house: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    sparse: true
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
  },
  floorNumber: {
    type: Number,
    min: 0
  },
  squareFootage: {
    type: Number,
    min: 0
  },
  hasWindow: {
    type: Boolean,
    default: true
  },
  hasBalcony: {
    type: Boolean,
    default: false
  },
  amenities: [{
    type: String,
    enum: ['AC', 'FAN', 'HEATER', 'FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED', 'ATTACHED_BATHROOM']
  }]
}, {
  timestamps: true
});

// Indexes
roomSchema.index({ property: 1, isAvailable: 1 });
roomSchema.index({ hostel: 1, isAvailable: 1 });
roomSchema.index({ house: 1, isAvailable: 1 });
roomSchema.index({ capacity: 1 });

// Virtuals
roomSchema.virtual('beds', {
  ref: 'Bed',
  localField: '_id',
  foreignField: 'room'
});

// Methods
roomSchema.methods.getRentableUnitData = function() {
  return {
    id: this._id,
    monthlyRent: this.monthlyRent,
    bookingFee: this.bookingFee,
    isAvailable: this.isAvailable
  };
};

roomSchema.methods.getAvailableBedsCount = function() {
  return mongoose.model('Bed').countDocuments({
    room: this._id,
    isAvailable: true
  });
};

roomSchema.methods.updateAvailability = async function() {
  if (this.hostel) {
    const availableBeds = await this.getAvailableBedsCount();
    this.isAvailable = availableBeds > 0;
    await this.save();
  }
};

// Pre-save middleware
roomSchema.pre('save', function(next) {
  this.bookingFee = this.monthlyRent * 0.1; // 10% booking fee
  next();
});

// Validate that room belongs to either property, hostel, or house
roomSchema.pre('validate', function(next) {
  const hasParent = this.property || this.hostel || this.house;
  if (!hasParent) {
    next(new Error('Room must belong to either a Property, Hostel, or House'));
    return;
  }
  if ((this.property && this.hostel) || (this.property && this.house) || (this.hostel && this.house)) {
    next(new Error('Room cannot belong to more than one parent container'));
    return;
  }
  next();
});

const Room = mongoose.models.Room || RentableUnit.discriminator('Room', roomSchema);
export default Room;
