import { Notification } from '../models/Notification.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import {
  createNotification,
  broadcastAnnouncement,
} from '../services/notificationService.mjs';
import mongoose from 'mongoose';

const getCurrentUserId = (req) => req.user.id || req.user.sub || req.user._id;

//  create a new single notification (system / internal)
export const createNotificationHandler = asyncHandler(async (req, res, next) => {
  try {
    const { recipientId, recipientRole, kind, title, message } =
      req.validatedData || req.body;
    const senderId = getCurrentUserId(req);

    if (!recipientId || !message) {
      return sendResponse(
        res,
        400,
        false,
        'recipientId and message are required',
      );
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return sendResponse(res, 400, false, 'Invalid recipientId format');
    }

    const notification = await createNotification({
      recipientRole,
      recipientId,
      kind,
      title,
      message,
      senderId,
    });

    return sendResponse(
      res,
      201,
      true,
      'Notification created successfully',
      notification,
    );
  } catch (error) {
    next(error);
  }
});

//  admin announcement broadcast to an audience (ALL|ADMIN|CLIENT|AGENT)
export const announce = asyncHandler(async (req, res, next) => {
  try {
    const { audience, title, message } = req.validatedData || req.body;
    const senderId = getCurrentUserId(req);

    if (!message) {
      return sendResponse(res, 400, false, 'message is required');
    }

    const notifications = await broadcastAnnouncement({
      audience,
      title,
      message,
      senderId,
    });

    return sendResponse(
      res,
      201,
      true,
      `Announcement sent to ${notifications.length} user(s)`,
      { count: notifications.length },
    );
  } catch (error) {
    next(error);
  }
});

//  history of announcements (persisted across recipients, de-duplicated by title+time)
export const getAnnouncementHistory = asyncHandler(async (req, res, next) => {
  try {
    const notices = await Notification.find({ announcement: true })
      .populate('senderId', 'firstName surname email')
      .sort({ createdAt: -1 })
      .limit(100);

    return sendResponse(
      res,
      200,
      true,
      'Announcement history retrieved',
      notices,
    );
  } catch (error) {
    next(error);
  }
});

//  get all notifications for the logged-in user
export const getNotifications = asyncHandler(async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);

    const notifications = await Notification.find({ recipientId: userId }).sort(
      { createdAt: -1 },
    );

    return sendResponse(
      res,
      200,
      true,
      'Notifications retrieved successfully',
      notifications,
    );
  } catch (error) {
    next(error);
  }
});

//  get unread notifications for the logged-in user
export const getUnreadNotifications = asyncHandler(async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);

    const notifications = await Notification.find({
      recipientId: userId,
      isRead: false,
    }).sort({ createdAt: -1 });

    return sendResponse(
      res,
      200,
      true,
      'Unread notifications retrieved successfully',
      {
        count: notifications.length,
        notifications,
      },
    );
  } catch (error) {
    next(error);
  }
});

//  get unread notification count
export const getNotificationCount = asyncHandler(async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);

    const count = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    return sendResponse(res, 200, true, 'Notification count retrieved', {
      unread: count,
    });
  } catch (error) {
    next(error);
  }
});

//  get notification by ID
export const getNotificationById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, 'Invalid notification ID format');
    }

    const notification = await Notification.findById(id);

    if (!notification) {
      return sendResponse(res, 404, false, 'Notification not found');
    }

    return sendResponse(res, 200, true, 'Notification found', notification);
  } catch (error) {
    next(error);
  }
});

//  mark one notification as read
export const markNotificationAsRead = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, 'Invalid notification ID format');
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { returnDocument: 'after', runValidators: true },
    );

    if (!notification) {
      return sendResponse(res, 404, false, 'Notification not found');
    }

    return sendResponse(
      res,
      200,
      true,
      'Notification marked as read',
      notification,
    );
  } catch (error) {
    next(error);
  }
});

//  mark all notifications as read for logged-in user
export const markAllNotificationsAsRead = asyncHandler(
  async (req, res, next) => {
    try {
      const userId = getCurrentUserId(req);

      await Notification.updateMany(
        { recipientId: userId, isRead: false },
        { $set: { isRead: true } },
      );

      return sendResponse(res, 200, true, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  },
);

//  delete one notification
export const deleteNotification = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, 'Invalid notification ID format');
    }

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return sendResponse(res, 404, false, 'Notification not found');
    }

    return sendResponse(res, 200, true, 'Notification deleted successfully');
  } catch (error) {
    next(error);
  }
});

//  delete all notifications for logged-in user
export const deleteAllNotifications = asyncHandler(async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);

    await Notification.deleteMany({ recipientId: userId });

    return sendResponse(
      res,
      200,
      true,
      'All notifications deleted successfully',
    );
  } catch (error) {
    next(error);
  }
});
