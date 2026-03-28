import mongoose from 'mongoose';

const houseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
  costCategory: {
    type: String,
    enum: ['Low_Cost', 'Medium_Cost', 'High_Cost'],
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const HouseListing = mongoose.model('House', houseSchema);
export default HouseListing;
