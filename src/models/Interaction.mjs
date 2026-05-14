import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['view', 'click', 'favorite', 'search'],
    required: true,
  },
  metadata: {
    timestamp: {
        type: Date,
        default: Date.now,
    },
    duration: Number,
    source: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Interaction = mongoose.model('Interaction', interactionSchema);
export default Interaction;
