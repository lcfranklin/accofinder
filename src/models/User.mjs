import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv'
dotenv.config();

const userSchema = new mongoose.Schema({
  name: {
    firstName: {
      type: String,
      required: true,
    },
    surname: {
      type: String,
      required: true,
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  residentialAddress: {
    district: { type: String, required: false, trim: true },
    traditionalAuthority: { type: String, required: false, trim: true },
    village: { type: String, required: false, trim: true },
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['agent', 'landlord', 'client', 'student', 'admin'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Fix 1: Use a regular function with async/await and call next properly
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(Number(process.env.SALT_ROUNDS) || 10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Alternative Fix 2: Without using next (preferred for async/await)
// userSchema.pre('save', async function () {
//   if (!this.isModified('password')) {
//     return;
//   }
  
//   try {
//     const salt = await bcrypt.genSalt(Number(process.env.SALT_ROUNDS) || 10);
//     this.password = await bcrypt.hash(this.password, salt);
//   } catch (error) {
//     throw error;
//   }
// });

const User = mongoose.model('User', userSchema);
export default User;