import express from 'express';
import {
  processMobilePayment,
  getSupportedMomoOperators,
  verifyMobilePayment,
  getSingleChargeDetails,
} from '../controllers/paymentController.mjs';

import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import {
  processMobilePaymentSchema,
  verifyPaymentSchema,
} from '../validators/paymentSchema.mjs';

const paymentRoutes = express.Router();

// Get list of supported mobile money operators
paymentRoutes.get('/operators', isAuthenticated, getSupportedMomoOperators);

// Initiate mobile money payment for a booking
paymentRoutes.post(
  '/process/:bookingId',
  isAuthenticated,
  checkRole(['CLIENT']),
  validateRequest(processMobilePaymentSchema),
  processMobilePayment,
);

// Verify payment status by charge ID
paymentRoutes.get(
  '/verify/:chargeId',
  isAuthenticated,
  validateRequest(verifyPaymentSchema, 'params'),
  verifyMobilePayment,
);

// Get single charge details from PayChangu
paymentRoutes.get(
  '/details/:chargeId',
  isAuthenticated,
  getSingleChargeDetails,
);

export default paymentRoutes;
