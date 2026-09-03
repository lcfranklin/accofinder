import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { UserRole } from './enums/UserRole.mjs';

dotenv.config();

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  surname: {
    type: String,
    required: true,
  },
  profileImage: {
    type: String,
    default: null,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 10,
    maxlength: 12,
  },
  residentialAddress: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    required: true,
  },
  assignedArea: {
    type: String,
    trim: true,
  },
  commissionRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  fcmToken: {
    type: String,
    default: null,
  },
  bankName: {
    type: String,
    default: '',
    trim: true,
  },
  bankAccountNumber: {
    type: String,
    default: '',
    trim: true,
  },
  paymentMethod: {
    type: String,
    default: 'Mobile money',
    trim: true,
  },
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function () {
  if (!this.password || !this.isModified('password')) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(Number(process.env.SALT_ROUNDS) || 10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.log('Error', error);
  }
});

userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.surname}`;
});

userSchema.methods.isAgent = function () {
  return this.role === UserRole.AGENT;
};

userSchema.methods.isClient = function () {
  return this.role === UserRole.CLIENT;
};

export const User = mongoose.model('User', userSchema);
