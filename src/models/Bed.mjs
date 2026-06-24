import mongoose from 'mongoose';
import RentableUnit from './RentableUnit.mjs';

const bedSchema = new mongoose.Schema({
    bedNumber: {
        type: String,
        required: true,
        trim: true
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
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
    bedType: {
        type: String,
        enum: ['SINGLE', 'DOUBLE', 'BUNK_TOP', 'BUNK_BOTTOM'],
        default: 'SINGLE'
    },
    position: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Indexes
bedSchema.index({ room: 1, isAvailable: 1 });
bedSchema.index({ bedNumber: 1, room: 1 }, { unique: true });

// Methods
bedSchema.methods.getRentableUnitData = function() {
    return {
        id: this._id,
        monthlyRent: this.monthlyRent,
        bookingFee: this.bookingFee,
        isAvailable: this.isAvailable
    };
};

bedSchema.methods.bookBed = async function() {
    if (!this.isAvailable) {
        throw new Error('Bed is not available');
    }
    this.isAvailable = false;
    await this.save();

    // Update room availability if all beds are booked
    const Room = mongoose.model('Room');
    const room = await Room.findById(this.room);
    if (room) {
        const availableBeds = await this.constructor.countDocuments({
            room: this.room,
            isAvailable: true
        });
        if (availableBeds === 0) {
            room.isAvailable = false;
            await room.save();
        }
    }

    return this;
};

bedSchema.methods.releaseBed = async function() {
    this.isAvailable = true;
    await this.save();

    // Update room availability
    const Room = mongoose.model('Room');
    const room = await Room.findById(this.room);
    if (room && !room.isAvailable) {
        room.isAvailable = true;
        await room.save();
    }

    return this;
};

// Pre-save middleware
bedSchema.pre('save', function(next) {
    this.bookingFee = this.monthlyRent * 0.1; // 10% booking fee
    next();
});

const Bed = mongoose.models.Bed || RentableUnit.discriminator('Bed', bedSchema);
export default Bed;
