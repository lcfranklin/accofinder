import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    url: { type: String, required: true },
    type: { type: String, required: true, default: 'image' },
    isPrimary: { type: Boolean, default: false },
    roomId: { type: String, default: '-1' },
  },
  { timestamps: true },
);

export const Media = mongoose.model('Media', mediaSchema);
