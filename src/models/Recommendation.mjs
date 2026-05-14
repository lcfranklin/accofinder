import mongoose from 'mongoose';

const recommendationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  house: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  recommendationType: {
    type: String,
    enum: ['content-based', 'collaborative', 'hybrid'],
    default: 'content-based',
  },
  metadata: {
    matchedFeatures: [String],
    reason: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

recommendationSchema.index({ user: 1, house: 1 }, { unique: true });

const Recommendation = mongoose.model('Recommendation', recommendationSchema);
export default Recommendation;
