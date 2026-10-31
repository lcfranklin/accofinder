import express from 'express';
import * as reviewController from '../controllers/reviewController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import {
  createReviewSchema,
  updateReviewSchema,
  queryReviewSchema,
} from '../validators/reviewSchema.mjs';

const reviewRoutes = express.Router();

// Summary must be before /:id style routes
reviewRoutes.get(
  '/property/:propertyId/summary',
  isAuthenticated,
  reviewController.getReviewSummary,
);

reviewRoutes.get(
  '/can-review/:propertyId',
  isAuthenticated,
  checkRole(['CLIENT', 'ADMIN']),
  reviewController.canReview,
);

reviewRoutes.get(
  '/property/:propertyId',
  isAuthenticated,
  reviewController.getReviewsByProperty,
);

reviewRoutes.get(
  '/agent/:agentId',
  isAuthenticated,
  reviewController.getReviewsByAgent,
);

reviewRoutes.post(
  '/',
  isAuthenticated,
  checkRole(['CLIENT', 'ADMIN']),
  validateRequest(createReviewSchema),
  reviewController.createReview,
);

reviewRoutes.patch(
  '/:id',
  isAuthenticated,
  validateRequest(updateReviewSchema),
  reviewController.updateReview,
);

reviewRoutes.delete(
  '/:id',
  isAuthenticated,
  reviewController.deleteReview,
);

export default reviewRoutes;