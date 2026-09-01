import mongoose from 'mongoose';

const agentApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    preferredArea: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export const AgentApplication = mongoose.model(
  'AgentApplication',
  agentApplicationSchema,
);