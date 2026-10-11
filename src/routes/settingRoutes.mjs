import express from 'express';

import * as settingController from '../controllers/settingController.mjs';

import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';

import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';

import { updatePlatformSettingSchema } from '../validators/updatePlatformSettingSchema.mjs';

const settingRoutes = express.Router();

// The platform booking fee is public so the app can fetch it on startup,
// before the user has signed in.
settingRoutes.get('/platform', settingController.getPlatformSettings);

// Only the admin can change the platform-wide booking fee.
settingRoutes.put(
  '/platform',
  isAuthenticated,
  checkRole(['ADMIN']),
  validateRequest(updatePlatformSettingSchema),
  settingController.updatePlatformSettings,
);

export default settingRoutes;
