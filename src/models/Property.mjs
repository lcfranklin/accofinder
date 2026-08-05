import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
    firstName: {
        type: String,
        trim: true
    },
    secondName: {
        type: String,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    status: {
        type: String,
        enum: ['NotVerified', 'Verified', 'Booked'],
        default: 'NotVerified'
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    landlordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    discriminatorKey: 'kind'
});

// Indexes
propertySchema.index({ landlordId: 1 });
propertySchema.index({ agentId: 1 });
propertySchema.index({ status: 1 });

const Property = mongoose.model('Property', propertySchema);
export default Property;