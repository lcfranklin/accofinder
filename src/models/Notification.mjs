import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['EMAIL', 'IN_APP', 'SMS'],
    default: 'EMAIL',
    required: true,
  },
  title: {
    type: String,
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
