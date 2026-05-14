import express from 'express';
import * as notificationController from '../controllers/notificationController.mjs';

const notificationRoutes = express.Router();

// 🔹 Create notification
notificationRoutes.post('/', notificationController.createNotification);

// 🔹 Get all notifications (for logged-in user)
notificationRoutes.get('/', notificationController.getNotifications);

// 🔹 Get unread notifications
notificationRoutes.get('/unread', notificationController.getUnreadNotifications);

// 🔹 Get unread count
notificationRoutes.get('/count', notificationController.getNotificationCount);

// 🔹 Get single notification by ID
notificationRoutes.get('/:id', notificationController.getNotificationById);

// 🔹 Mark one notification as read
notificationRoutes.patch('/:id/read', notificationController.markNotificationAsRead);

// 🔹 Mark all notifications as read
notificationRoutes.patch('/read/all', notificationController.markAllNotificationsAsRead);

// 🔹 Delete one notification
notificationRoutes.delete('/:id', notificationController.deleteNotification);

// 🔹 Delete all notifications
notificationRoutes.delete('/', notificationController.deleteAllNotifications);

export default notificationRoutes;