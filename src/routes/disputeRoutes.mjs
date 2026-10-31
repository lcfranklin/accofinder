import express from 'express';
import * as disputeController from '../controllers/disputeController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import { createDisputeSchema } from '../validators/createDisputeSchema.mjs';
import { updateDisputeSchema } from '../validators/updateDisputeSchema.mjs';
import { queryDisputeSchema } from '../validators/queryDisputeSchema.mjs';

const disputeRoutes = express.Router();

// Get all disputes (Admin / Support view)
disputeRoutes.get(
  '/',
  isAuthenticated,
  checkRole(['ADMIN', 'AGENT', 'CLIENT']),
  validateRequest(queryDisputeSchema, 'query'),
  disputeController.getAllDisputes,
);

// Get single dispute by ID
disputeRoutes.get(
  '/:id',
  isAuthenticated,
  checkRole(['ADMIN', 'AGENT', 'CLIENT']),
  disputeController.getDisputeById,
);

// Raise a new dispute
disputeRoutes.post(
  '/',
  isAuthenticated,
  checkRole(['CLIENT', 'ADMIN']),
  validateRequest(createDisputeSchema),
  disputeController.raiseDispute,
);

// Resolve or reject a dispute
disputeRoutes.patch(
  '/:id/resolve',
  isAuthenticated,
  checkRole(['ADMIN', 'AGENT']),
  validateRequest(updateDisputeSchema),
  disputeController.resolveDispute,
);

// Delete a dispute record
disputeRoutes.delete(
  '/:id',
  isAuthenticated,
  checkRole(['ADMIN']),
  disputeController.deleteDispute,
);

export default disputeRoutes;
