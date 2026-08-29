import express from 'express';
import * as verificationController from '../controllers/verificationController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';

const verificationRoutes = express.Router();

// History must be declared before any parameterized GET/static matching that
// could swallow it; methods differ so order is safe.
verificationRoutes.get(
  '/history',
  isAuthenticated,
  checkRole(['ADMIN']),
  verificationController.getVerificationHistory,
);

// Save a verification for a property (app: POST /api/property/:id)
verificationRoutes.post(
  '/:id',
  isAuthenticated,
  checkRole(['AGENT', 'ADMIN']),
  verificationController.createVerification,
);

// Approve / reject a property (app: PATCH /api/property/:propertyId)
verificationRoutes.patch(
  '/:propertyId',
  isAuthenticated,
  checkRole(['AGENT', 'ADMIN']),
  verificationController.approveOrRejectProperty,
);

export default verificationRoutes;