import express from 'express';

import * as bookingController from '../controllers/bookingController.mjs';

import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';

import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';

import { createBookingSchema } from '../validators/createBookingSchema.mjs';

const bookingRoutes = express.Router();

// Create a new booking reservation
bookingRoutes.post(
  '/',
  isAuthenticated,
  checkRole(['CLIENT', 'ADMIN']),
  validateRequest(createBookingSchema),
  bookingController.createBooking,
);

// Get all bookings
bookingRoutes.get(
  '/',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  bookingController.getBookings,
);

// Get single booking by ID
bookingRoutes.get('/:id', isAuthenticated, bookingController.getBookingById);

// Cancel a booking reservation
bookingRoutes.patch(
  '/:id/cancel',
  isAuthenticated,
  checkRole(['CLIENT', 'LANDLORD', 'ADMIN']),
  bookingController.cancelBooking,
);

// Confirm a booking
bookingRoutes.patch(
  '/:id/confirm',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  bookingController.confirmBooking,
);

// Update booking details
bookingRoutes.patch(
  '/:id',
  isAuthenticated,
  checkRole(['CLIENT', 'ADMIN']),
  bookingController.updateBooking,
);

// Delete a booking record
bookingRoutes.delete(
  '/:id',
  isAuthenticated,
  checkRole(['ADMIN']),
  bookingController.deleteBooking,
);

export default bookingRoutes;
