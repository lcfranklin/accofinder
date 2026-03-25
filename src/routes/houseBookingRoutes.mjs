import express from 'express'
import * as houseBookingController from '../controllers/houseBookingController.mjs'

const houseBookingRoutes = express.Router();

houseBookingRoutes.use('/', houseBookingController.getBookings)

export default houseBookingRoutes;
























