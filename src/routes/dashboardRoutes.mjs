import express from 'express';
import {
  getDashboardStats,
  getPaymentsOverview,
} from '../controllers/dashboardController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';

const dashboardRoutes = express.Router();

// Admin dashboard aggregate stats (users, agents, properties, bookings, etc.)
dashboardRoutes.get(
  '/stats',
  isAuthenticated,
  checkRole(['ADMIN']),
  getDashboardStats,
);

// Admin payments / commission / payout oversight summary + lists
dashboardRoutes.get(
  '/payments',
  isAuthenticated,
  checkRole(['ADMIN']),
  getPaymentsOverview,
);

export default dashboardRoutes;