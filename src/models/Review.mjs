import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
  },
  { timestamps: true },
);

export const Review = mongoose.model('Review', reviewSchema);
