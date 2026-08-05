import mongoose from 'mongoose';

const baseOptions = {
  discriminatorKey: 'role',
  collection: 'users',
  timestamps: true,
};

// Base User Schema
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true },
    password: { type: String, required: true },
  },
  baseOptions,
);

// Virtual property for full name
userSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export const User = mongoose.model('User', userSchema);

// Agent Discriminator
export const Agent = User.discriminator(
  'Agent',
  new mongoose.Schema({
    employeeId: { type: String, required: true, unique: true },
    assignedArea: { type: String, required: true },
    commissionRate: { type: Number, required: true, default: 0.0 },
    isActive: { type: Boolean, default: true },
  }),
);

// Client Discriminator
export const Client = User.discriminator(
  'Client',
  new mongoose.Schema({
    isStudent: { type: Boolean, default: false },
    preferredLocation: { type: String, default: '' },
    budgetMin: { type: Number, default: 0 },
    budgetMax: { type: Number, default: 0 },
  }),
);

// Landlord Discriminator
export const Landlord = User.discriminator(
  'Landlord',
  new mongoose.Schema({
    paymentDetails: { type: String, required: true },
  }),
);
