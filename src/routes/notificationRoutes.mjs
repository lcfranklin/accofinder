import express from 'express';
import * as notificationController from '../controllers/notificationController.mjs';

const notificationRoutes = express.Router();

notificationRoutes.get('/', notificationController.getNotifications);
notificationRoutes.post('/', notificationController.createNotification);

export default notificationRoutes;
