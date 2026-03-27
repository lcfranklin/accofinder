import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const houseBookingSchema = new Schema(
    {
        house: {
        type: Types.ObjectId,
        ref: 'House',
        required: true,
        },

        tenant: {
        type: Types.ObjectId,
        ref: 'User',
        required: true,
        },

        owner: {
        type: Types.ObjectId,
        ref: 'User',
        required: true,
        },

        // Booking Period
        startDate: {
        type: Date,
        required: true,
        },

        endDate: {
        type: Date,
        required: true,
        },

        numberOfMonths: {
        type: Number,
        required: true,
        min: 1,
        },

        // Pricing - Full Payment Only
        pricePerMonth: {
        type: Number,
        required: true,
        },

        totalAmount: {
        type: Number,
        required: true,
        },

        payment: {
        type: Types.ObjectId,
        ref: 'Payment',
        required: false,           // Will be added after successful payment
        },

        // Payment Summary
        isPaid: {
        type: Boolean,
        default: false,
        },

        paidAt: {
        type: Date,
        },

        // Booking Status
        status: {
        type: String,
        enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'rejected'],
        default: 'pending',
        },

        // Additional fields
        specialNotes: {
        type: String,
        trim: true,
        },

        cancelledAt: Date,
        cancelledBy: {
        type: Types.ObjectId,
        ref: 'User',
        },

        createdBy: {
        type: Types.ObjectId,
        ref: 'User',
        },
    },
    {
        timestamps: true,
    }
    );

    // Pre-save middleware to keep status and isPaid in sync
    houseBookingSchema.pre('save', function (next) {
    if (this.isPaid) {
        this.status = this.status === 'pending' ? 'confirmed' : this.status;
    }
    next();
});

const HouseBooking = model('HouseBooking', houseBookingSchema);

export default HouseBooking;