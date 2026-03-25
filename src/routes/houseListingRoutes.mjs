import express from 'express';
import * as houseController from '../controllers/houseListingController.mjs';

const houseListingRoutes = express.Router();

houseListingRoutes.get('/', houseController.getHouses);
houseListingRoutes.post('/', houseController.createHouse);

export default houseListingRoutes;
