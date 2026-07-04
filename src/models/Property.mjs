import mongoose from 'mongoose';
import { VerificationStatus } from './enums/VerificationStatus.mjs';

const propertySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
        owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    physicalAddress: {
        district: {
            type: String,
            required: true,
            trim: true
        },
        village: {
            type: String,
            required: true,
            trim: true
        },
        location: {
            type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
            },
            coordinates: {
            type: [Number],
            required: true,
            index: '2dsphere'
            }
        },
    },
    verificationStatus: {
        type: String,
        enum: Object.values(VerificationStatus),
        default: VerificationStatus.PENDING
    },
    amenities: [{
        type: String,
        enum: ['WIFI', 'PARKING', 'SECURITY', 'WATER', 'ELECTRICITY', 'FURNISHED', 'AC']
    }],
    media: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    averageRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    }
    }, {
    timestamps: true
});

// Indexes
propertySchema.index({ owner: 1 });
propertySchema.index({ district: 1, village: 1 });
propertySchema.index({ verificationStatus: 1 });
propertySchema.index({ location: '2dsphere' });

// Virtuals
propertySchema.virtual('houses', {
    ref: 'House',
    localField: '_id',
    foreignField: 'property'
    });

    propertySchema.virtual('hostels', {
    ref: 'Hostel',
    localField: '_id',
    foreignField: 'property'
    });

    propertySchema.virtual('standaloneRooms', {
    ref: 'Room',
    localField: '_id',
    foreignField: 'property'
});

// Methods
propertySchema.methods.isVerified = function() {
    return this.verificationStatus === VerificationStatus.VERIFIED;
};

propertySchema.methods.updateRating = function(newRating) {
    this.totalReviews += 1;
    this.averageRating = ((this.averageRating * (this.totalReviews - 1)) + newRating) / this.totalReviews;
    return this.save();
};

const Property = mongoose.model('Property', propertySchema);
export default Property;