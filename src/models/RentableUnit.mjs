import mongoose from 'mongoose';

/**
 * Abstract base schema for rentable units
 * This is not a real collection in MongoDB but serves as a base for other models
 */
const rentableUnitSchema = new mongoose.Schema({
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
    discriminatorKey: '__type',
    collection: 'rentableunits',
    timestamps: true
});

rentableUnitSchema.methods.book = async function(user, startDate, endDate) {
    throw new Error('Book method must be implemented by child class');
};

rentableUnitSchema.methods.cancelBooking = async function(bookingId) {
    throw new Error('CancelBooking method must be implemented by child class');
};

rentableUnitSchema.methods.checkAvailability = function(startDate, endDate) {
    throw new Error('checkAvailability method must be implemented by child class');
};

rentableUnitSchema.statics.findAvailable = function(startDate, endDate) {
    return this.find({ isAvailable: true });
};

const RentableUnit = mongoose.models.RentableUnit || mongoose.model('RentableUnit', rentableUnitSchema);
export default RentableUnit;
