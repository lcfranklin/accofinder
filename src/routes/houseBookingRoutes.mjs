import express from 'express';
import * as houseBookingController from '../controllers/houseBookingController.mjs';

const houseBookingRoutes = express.Router();

houseBookingRoutes.use('/', houseBookingController.getBookings);
houseBookingRoutes.post('/', houseBookingController.createBook);
houseBookingRoutes.get('/:id', houseBookingController.getBookingById);
houseBookingRoutes.delete('/:id', houseBookingController.deleteBooking);
houseBookingRoutes.put('/:id', houseBookingController.updateBooking);

export default houseBookingRoutes;
