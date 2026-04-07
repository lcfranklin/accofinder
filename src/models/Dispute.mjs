import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  relatedHouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Open', 'Under_Review', 'Resolved', 'Closed'],
    default: 'Open',
  },
  resolutionNotes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
 
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

const Dispute = mongoose.model('Dispute', disputeSchema);
export default Dispute;
