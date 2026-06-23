import express from 'express'
import * as houseController from '../controllers/houseController.mjs'

const houseRoutes = express.Router();

houseRoutes.use('/', houseController.getBookings)

export default houseRoutes;
























