import mongoose from 'mongoose';
import { PaymentStatus } from './enums/PaymentStatus.mjs';

const { Schema, model, Types } = mongoose;

const paymentSchema = new Schema({
    client: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'MK'
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'mobile_money'],
        default: 'card'
    },
    status: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.INITIATED
    },
    transactionId: {
        type: String,
        trim: true
    },
    refundedAt: {
        type: Date,
        default: Date.now
    },
    paidAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Payment = model('Payment', paymentSchema);
export default Payment;