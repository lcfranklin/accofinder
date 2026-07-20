import mongoose from 'mongoose';
import RentableUnit from './RentableUnit.mjs';

const hostelSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'mixed'],
    },
    totalRooms: {
      type: Number,
      required: true,
      min: 1,
    },
    totalBeds: {
      type: Number,
      required: true,
      min: 1,
    },
    amenities: [
      {
        type: String,
        enum: [
          'WIFI',
          'PARKING',
          'SECURITY',
          'WATER',
          'ELECTRICITY',
          'COMMON_AREA',
          'LAUNDRY',
          'CCTV',
        ],
      },
    ],
    rules: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
hostelSchema.index({ property: 1 });
hostelSchema.index({ isActive: 1 });

// Virtuals
hostelSchema.virtual('rooms', {
  ref: 'Room',
  localField: '_id',
  foreignField: 'hostel',
});

// Methods
hostelSchema.methods.getAvailableRoomsCount = async function () {
  const Room = mongoose.model('Room');
  const count = await Room.countDocuments({
    hostel: this._id,
    isAvailable: true,
  });
  return count;
};

hostelSchema.methods.getTotalAvailableBeds = async function () {
  const Room = mongoose.model('Room');
  const Bed = mongoose.model('Bed');
  const rooms = await Room.find({ hostel: this._id });
  const roomIds = rooms.map((room) => room._id);

  const totalBeds = await Bed.countDocuments({
    room: { $in: roomIds },
    isAvailable: true,
  });

  return totalBeds;
};

const Hostel =
  mongoose.models.Hostel || RentableUnit.discriminator('Hostel', hostelSchema);
export default Hostel;
