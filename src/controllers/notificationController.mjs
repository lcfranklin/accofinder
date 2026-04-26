import Notification from "../models/Notification.mjs";

// Create Notification
export const createNotification = async (req, res, next) => {
  try {
    const { userId, message, type } = req.body;

    // Validate required fields
    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        message: "userId and message are required"
      });
    }

    const notification = new Notification({
      userId,
      message,
      type: type 
    });

    await notification.save();

    res.status(201).json(notification);

  } catch (error) {
    next(error);
  }
};



//  Mark one notification as read
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification
    });

  } catch (error) {
    next(error);
  }
};



// Delete one notification
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully"
    });

  } catch (error) {
    next(error);
  }
};



//  Get all notifications for logged-in user   recipient: req.user.id
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification
      .find({ }) 
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);

  } catch (error) {
    next(error);
  }
};



// Get unread notifications
export const getUnreadNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.id, 
      isRead: false
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });

  } catch (error) {
    next(error);
  }
};



//  Get unread count
export const getNotificationCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id, 
      isRead: false
    });

    res.status(200).json({
      success: true,
      unread: count
    });

  } catch (error) {
    next(error);
  }
};



//  Mark all as read
export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read"
    });

  } catch (error) {
    next(error);
  }
};



//  Delete all notifications
export const deleteAllNotifications = async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id }); 

    res.status(200).json({
      success: true,
      message: "All notifications deleted"
    });

  } catch (error) {
    next(error);
  }
};



//  Get notification by ID
export const getNotificationById = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });

  } catch (error) {
    next(error);
  }
};