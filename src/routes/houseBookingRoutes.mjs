import express from 'express';
import * as bookingController from '../controllers/houseBookingController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import { createBookingSchema } from '../validators/createBookingSchema.mjs';
import { updateBookingSchema } from '../validators/updateBookingSchema.mjs';

const houseBookingRoutes = express.Router();

houseBookingRoutes.get(
  '/',
  isAuthenticated,
  checkRole('Admin'),
  bookingController.getBookings,
);

houseBookingRoutes.get(
  '/:id',
  isAuthenticated,
  bookingController.getBookingById,
);

houseBookingRoutes.post(
  '/',
  isAuthenticated,
  validateRequest(createBookingSchema),
  bookingController.createBooking,
);

houseBookingRoutes.patch(
  '/:id',
  isAuthenticated,
  validateRequest(updateBookingSchema),
  bookingController.updateBooking,
);

houseBookingRoutes.delete(
  '/:id',
  isAuthenticated,
  bookingController.deleteBooking,
);

houseBookingRoutes.patch(
  '/:id/cancel',
  isAuthenticated,
  bookingController.cancelBooking,
);

houseBookingRoutes.patch(
  '/:id/confirm',
  isAuthenticated,
  bookingController.confirmBooking,
);

export default houseBookingRoutes;
