import express from 'express';
import * as houseController from '../controllers/houseListingController.mjs';

const houseListingRoutes = express.Router();

houseListingRoutes.get('/', houseController.getHouses);
houseListingRoutes.post('/', houseController.createHouse);
houseListingRoutes.get('/:id', houseController.getHouseById);
houseListingRoutes.patch('/:id', houseController.updateHouse);
houseListingRoutes.delete('/:id', houseController.deleteHouse);

export default houseListingRoutes;
