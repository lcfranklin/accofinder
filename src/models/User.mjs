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
    required: function() { return !this.googleId; },
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, 
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

// FIX: Use regular function with async/await, don't use next parameter
userSchema.pre('save', async function(next) {
  // Only hash password if it exists and is modified
  if (!this.password || !this.isModified('password')) {
  }
  
  try {
    const salt = await bcrypt.genSalt(Number(process.env.SALT_ROUNDS) || 10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.log("Error", error);
  }
});

const User = mongoose.model('User', userSchema);
export default User;