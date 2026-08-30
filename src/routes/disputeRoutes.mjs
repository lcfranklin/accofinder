import express from 'express';
import * as disputeController from '../controllers/disputeController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';

const disputeRoutes = express.Router();

// Get all disputes (Admin / Support view)
disputeRoutes.get(
  '/',
  isAuthenticated,
  checkRole(['ADMIN', 'AGENT']),
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
disputeRoutes.post('/', isAuthenticated, disputeController.raiseDispute);

// Resolve or reject a dispute
disputeRoutes.patch(
  '/:id/resolve',
  isAuthenticated,
  checkRole(['ADMIN', 'AGENT']),
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
