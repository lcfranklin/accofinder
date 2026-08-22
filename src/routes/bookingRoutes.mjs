import express from 'express';
import * as bookingController from '../controllers/bookingController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import { createBookingSchema } from '../validators/createBookingSchema.mjs';
import { updateBookingStatusSchema } from '../validators/updateBookingStatusSchema.mjs';
import { queryBookingSchema } from '../validators/queryBookingSchema.mjs';

const bookingRoutes = express.Router();

// Create a new booking reservation
bookingRoutes.post(
  '/',
  isAuthenticated,
  checkRole(['CLIENT', 'ADMIN']),
  validateRequest(createBookingSchema),
  bookingController.createBooking,
);

// Get current authenticated user's bookings (Client history)
bookingRoutes.get(
  '/my-bookings',
  isAuthenticated,
  bookingController.getMyBookings,
);

// Cancel a booking reservation
bookingRoutes.patch(
  '/:id/cancel',
  isAuthenticated,
  checkRole(['CLIENT', 'LANDLORD', 'ADMIN']),
  bookingController.cancelBooking,
);

// Get all bookings across system with query filters
bookingRoutes.get(
  '/',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  validateRequest(queryBookingSchema, 'query'),
  bookingController.getAllBookings,
);

// Get single booking by ID
bookingRoutes.get('/:id', isAuthenticated, bookingController.getBookingById);

// Update booking status (e.g. PENDING -> CONFIRMED / PAID)
bookingRoutes.patch(
  '/:id/status',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  validateRequest(updateBookingStatusSchema),
  bookingController.updateBookingStatus,
);

// Delete a booking record
bookingRoutes.delete(
  '/:id',
  isAuthenticated,
  checkRole(['ADMIN']),
  bookingController.deleteBooking,
);

export default bookingRoutes;
