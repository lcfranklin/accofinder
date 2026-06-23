import mongoose from 'mongoose';
import { BookingType } from './enums/BookingType.mjs';
import { BookingStatus } from './enums/BookingStatus.mjs';

const bookingSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rentableUnit: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'rentableUnitType'
  },
  rentableUnitType: {
    type: String,
    required: true,
    enum: ['House', 'Room', 'Bed']
  },
  bookingType: {
    type: String,
    enum: Object.values(BookingType),
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  bookingFee: {
    type: Number,
    required: true,
    min: 0
  },
  totalRentAmount: {
    type: Number,
    required: true,
    min: 0
  },
  isBookingFeePaid: {
    type: Boolean,
    default: false
  },
  isFullRentPaid: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: Object.values(BookingStatus),
    default: BookingStatus.PENDING
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  cancellationDate: {
    type: Date,
    default: null
  },
  checkInDate: {
    type: Date,
    default: null
  },
  checkOutDate: {
    type: Date,
    default: null
  },
  tenantNotes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
bookingSchema.index({ tenant: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ startDate: -1, endDate: -1 });
bookingSchema.index({ rentableUnit: 1, rentableUnitType: 1 });

// Virtuals
bookingSchema.virtual('isActive').get(function() {
  return this.status === BookingStatus.ACTIVE || this.status === BookingStatus.CONFIRMED;
});

bookingSchema.virtual('canCancel').get(function() {
  if (this.status === BookingStatus.CANCELLED || this.status === BookingStatus.ACTIVE) {
    return false;
  }
  const now = new Date();
  const startDate = new Date(this.startDate);
  const daysUntilStart = Math.floor((startDate - now) / (1000 * 60 * 60 * 24));
  return daysUntilStart >= 3; // Can cancel at least 3 days before start
});

// Methods
bookingSchema.methods.confirmBooking = async function() {
  if (this.status !== BookingStatus.PENDING) {
    throw new Error('Only pending bookings can be confirmed');
  }
  this.status = BookingStatus.CONFIRMED;
  await this.save();
  return this;
};

bookingSchema.methods.activateBooking = async function() {
  if (this.status !== BookingStatus.CONFIRMED) {
    throw new Error('Only confirmed bookings can be activated');
  }
  this.status = BookingStatus.ACTIVE;
  this.checkInDate = new Date();
  await this.save();
  return this;
};

bookingSchema.methods.cancelBooking = async function(reason) {
  if (!this.canCancel) {
    throw new Error('Booking cannot be cancelled');
  }
  this.status = BookingStatus.CANCELLED;
  this.cancellationReason = reason;
  this.cancellationDate = new Date();

  const RentableUnitModel = mongoose.model(this.rentableUnitType);
  const unit = await RentableUnitModel.findById(this.rentableUnit);
  if (unit) {
    unit.isAvailable = true;
    await unit.save();
  }

  await this.save();
  return this;
};

bookingSchema.methods.checkOut = async function() {
  if (this.status !== BookingStatus.ACTIVE) {
    throw new Error('Only active bookings can be checked out');
  }
  this.status = BookingStatus.COMPLETED;
  this.checkOutDate = new Date();

  const RentableUnitModel = mongoose.model(this.rentableUnitType);
  const unit = await RentableUnitModel.findById(this.rentableUnit);
  if (unit) {
    unit.isAvailable = true;
    await unit.save();
  }

  await this.save();
  return this;
};

// Pre-save middleware
bookingSchema.pre('save', function(next) {
  // Validate dates
  if (this.startDate >= this.endDate) {
    next(new Error('End date must be after start date'));
    return;
  }

  // Validate if start date is in the future
  const now = new Date();
  if (this.startDate <= now) {
    next(new Error('Start date must be in the future'));
    return;
  }

  next();
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
