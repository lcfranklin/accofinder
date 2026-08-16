import { Notification } from '../models/Notification.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import mongoose from 'mongoose';

//  create a new notification
export const createNotification = asyncHandler(async (req, res, next) => {
  try {
    const { userId, message, type } = req.validatedData || req.body;

    if (!userId || !message) {
      return sendResponse(res, 400, false, 'userId and message are required');
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendResponse(res, 400, false, 'Invalid userId format');
    }

    const notification = await Notification.create({
      userId: new mongoose.Types.ObjectId(userId),
      message,
      type,
    });

    if (!notification) {
      return sendResponse(res, 400, false, 'Failed to create notification');
    }

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

//  get all notifications for the logged-in user
export const getNotifications = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.sub || req.user._id;

    const notifications = await Notification.find({ userId }).sort({
      createdAt: -1,
    });

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
    const userId = req.user.id || req.user.sub || req.user._id;

    const notifications = await Notification.find({
      userId,
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
    const userId = req.user.id || req.user.sub || req.user._id;

    const count = await Notification.countDocuments({
      userId,
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
      const userId = req.user.id || req.user.sub || req.user._id;

      await Notification.updateMany(
        { userId, isRead: false },
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
    const userId = req.user.id || req.user.sub || req.user._id;

    await Notification.deleteMany({ userId });

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
