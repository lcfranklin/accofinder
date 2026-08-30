import mongoose from 'mongoose';

const recommendationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    house: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    reasons: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const Recommendation = mongoose.model(
  'Recommendation',
  recommendationSchema,
);
export default Recommendation;