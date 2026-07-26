import express from 'express';
import {
  processMobilePayment,
  getSupportedMomoOperators,
  verifyMobilePayment,
  getSingleChargeDetails,
} from '../controllers/paymentController.mjs';

import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import { processMobilePaymentSchema } from '../validators/paymentSchema.mjs';

const router = express.Router();

router.get(
  '/operators',
  isAuthenticated,
  getSupportedMomoOperators
);

router.post(
  '/process/:bookingId',
  isAuthenticated,
  checkRole(['CLIENT']),
  validateRequest(processMobilePaymentSchema),
  processMobilePayment
);

router.get(
  '/verify/:chargeId',
  isAuthenticated,
  verifyMobilePayment
);

router.get(
  '/details/:chargeId',
  isAuthenticated,
  getSingleChargeDetails
);

export default router;
