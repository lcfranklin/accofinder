import mongoose from "mongoose";
import Property from "./Property.mjs";

const hostelSchema = new mongoose.Schema({
    gender:{
        type: String,
        enum: ['MALE', 'FEMALE', 'MIXED'],
    },
    totalRooms: {
        type: Number,
        required: true,
        min: 1
    },
    totalBeds: {
        type: Number,
        required: true,
        min: 1
    },
    amenities: [{
        type: String,
        enum: ['WIFI', 'PARKING', 'SECURITY', 'WATER', 'ELECTRICITY', 'COMMON_AREA', 'LAUNDRY', 'CCTV']
    }],
    rules: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    }
    }, {
    timestamps: true
});

// Indexes
hostelSchema.index({ isActive: 1 });

// Virtuals
hostelSchema.virtual('rooms', {
    ref: 'Room',
    localField: '_id',
    foreignField: 'hostel'
});

// Methods
hostelSchema.methods.getAvailableRoomsCount = async function() {
    const Room = mongoose.model('Room');
    const count = await Room.countDocuments({
        hostel: this._id,
        isAvailable: true
    });
    return count;
};

hostelSchema.methods.getTotalAvailableBeds = async function() {
    const Room = mongoose.model('Room');
    const rooms = await Room.find({ hostel: this._id });
    let totalBeds = 0;
    for (const room of rooms) {
        const beds = await mongoose.model('Bed').countDocuments({
        room: room._id,
        isAvailable: true
        });
        totalBeds += beds;
    }
    return totalBeds;
};

const Hostel = mongoose.models.Hostel || Property.discriminator('Hostel', hostelSchema);
export default Hostel;