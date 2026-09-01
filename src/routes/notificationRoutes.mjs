import express from 'express';
import * as notificationController from '../controllers/notificationController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';
import { socketMiddleware } from '../middleware/socketMiddleware.mjs';
import { getIO } from '../sockets/socketHandler.mjs';

const notificationRoutes = express.Router();
notificationRoutes.use(socketMiddleware(getIO));

// 🔹 Get all notifications (for logged-in user)
notificationRoutes.get('/',
  isAuthenticated,
  notificationController.getNotifications);

// 🔹 Admin announcement broadcast
notificationRoutes.post('/announce',
  isAuthenticated,
  checkRole(['ADMIN']),
  notificationController.announce);

// 🔹 Announcement history (sent announcements)
notificationRoutes.get('/announcements',
  isAuthenticated,
  checkRole(['ADMIN']),
  notificationController.getAnnouncementHistory);

// 🔹 Get unread notifications
notificationRoutes.get('/unread',
  isAuthenticated,
  notificationController.getUnreadNotifications);

// 🔹 Get unread count
notificationRoutes.get('/count',
  isAuthenticated,
  notificationController.getNotificationCount);

// 🔹 Create notification
notificationRoutes.post('/',
  isAuthenticated,
  notificationController.createNotificationHandler);

// 🔹 Get single notification by ID
notificationRoutes.get('/:id',
  isAuthenticated,
  notificationController.getNotificationById);

// 🔹 Mark one notification as read
notificationRoutes.patch('/:id/read',
  isAuthenticated,
  notificationController.markNotificationAsRead);

// 🔹 Mark all notifications as read
notificationRoutes.patch('/read/all',
  isAuthenticated,
  notificationController.markAllNotificationsAsRead);

// 🔹 Delete one notification
notificationRoutes.delete('/:id',
  isAuthenticated,
  notificationController.deleteNotification);

// 🔹 Delete all notifications
notificationRoutes.delete('/',
  isAuthenticated,
  notificationController.deleteAllNotifications);

export default notificationRoutes;