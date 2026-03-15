import express from 'express';
import * as notificationController from '../controllers/notificationController.mjs';

const router = express.Router();

router.get('/', notificationController.getNotifications);
router.post('/', notificationController.createNotification);

export default router;
